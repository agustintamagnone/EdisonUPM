-- Add optional traction metrics to an existing Edison UPM database without
-- dropping ideas or other application data.
CREATE TABLE IF NOT EXISTS idea_metrics (
  idea_id       CHAR(36)     NOT NULL,
  display_order INT          NOT NULL,
  metric        VARCHAR(200) NOT NULL,
  PRIMARY KEY (idea_id, display_order),
  CONSTRAINT fk_metrics_idea FOREIGN KEY (idea_id) REFERENCES ideas (id) ON DELETE CASCADE
) ENGINE = InnoDB;
