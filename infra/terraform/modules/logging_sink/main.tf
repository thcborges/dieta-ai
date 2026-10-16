terraform {
  required_version = ">= 1.5.0"
  required_providers {
    google = {
      source  = "hashicorp/google"
      version = ">= 5.0.0"
    }
  }
}

variable "project_id" {
  type        = string
  description = "GCP Project ID"
}

variable "sink_name" {
  type        = string
  description = "Nome do Cloud Logging Sink"
  default     = "dieta-ai-error-sink"
}

variable "pubsub_topic_id" {
  type        = string
  description = "ID do tópico Pub/Sub de destino (projects/PROJECT_ID/topics/TOPIC_NAME)"
}

resource "google_logging_project_sink" "error_sink" {
  project     = var.project_id
  name        = var.sink_name
  destination = "pubsub.googleapis.com/${var.pubsub_topic_id}"

  # Filtro estrito: apenas ocorrências com severidade ERROR ou CRITICAL do app dieta-ai
  filter = "severity >= ERROR AND (jsonPayload.targetPubSubTopic = \"dieta-ai-errors-dev\" OR jsonPayload.app = \"dieta-ai\")"

  unique_writer_identity = true
}

# Permissão para o Sink publicar no Tópico do Pub/Sub
resource "google_pubsub_topic_iam_member" "sink_publisher" {
  project = var.project_id
  topic   = var.pubsub_topic_id
  role    = "roles/pubsub.publisher"
  member  = google_logging_project_sink.error_sink.writer_identity
}

output "sink_name" {
  value       = google_logging_project_sink.error_sink.name
  description = "Nome do Cloud Logging Sink"
}

output "writer_identity" {
  value       = google_logging_project_sink.error_sink.writer_identity
  description = "Service Account Writer do Sink"
}
