package es.upm.edison;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.context.properties.ConfigurationPropertiesScan;

@SpringBootApplication
@ConfigurationPropertiesScan
public class EdisonUpmApplication {

    public static void main(String[] args) {
        SpringApplication.run(EdisonUpmApplication.class, args);
    }
}
