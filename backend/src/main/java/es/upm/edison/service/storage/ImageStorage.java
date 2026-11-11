package es.upm.edison.service.storage;

import org.springframework.core.io.Resource;

import java.io.InputStream;

/** "Image Storage" of the infrastructure layer: where screenshot files are kept. */
public interface ImageStorage {

    /** Stores the file and returns the key used to load or delete it later. */
    String store(InputStream content, String extension);

    Resource load(String storageKey);

    void delete(String storageKey);
}
