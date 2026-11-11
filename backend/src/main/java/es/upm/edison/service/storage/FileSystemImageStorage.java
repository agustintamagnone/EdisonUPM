package es.upm.edison.service.storage;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.PathResource;
import org.springframework.core.io.Resource;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.io.InputStream;
import java.io.UncheckedIOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.UUID;

/** Keeps images in a local folder ({@code edison.storage.images-dir}). Can be swapped for S3 or similar. */
@Component
public class FileSystemImageStorage implements ImageStorage {

    private final Path root;

    public FileSystemImageStorage(@Value("${edison.storage.images-dir}") String imagesDir) {
        this.root = Path.of(imagesDir).toAbsolutePath().normalize();
        try {
            Files.createDirectories(root);
        } catch (IOException e) {
            throw new UncheckedIOException("Cannot create image storage folder " + root, e);
        }
    }

    @Override
    public String store(InputStream content, String extension) {
        String key = UUID.randomUUID() + "." + extension;
        try {
            Files.copy(content, resolve(key));
            return key;
        } catch (IOException e) {
            throw new UncheckedIOException("Cannot store image", e);
        }
    }

    @Override
    public Resource load(String storageKey) {
        return new PathResource(resolve(storageKey));
    }

    @Override
    public void delete(String storageKey) {
        try {
            Files.deleteIfExists(resolve(storageKey));
        } catch (IOException e) {
            throw new UncheckedIOException("Cannot delete image " + storageKey, e);
        }
    }

    private Path resolve(String storageKey) {
        Path path = root.resolve(storageKey).normalize();
        if (!path.startsWith(root)) {
            throw new IllegalArgumentException("Invalid storage key");
        }
        return path;
    }
}
