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

variable "topic_name" {
  type        = string
  description = "Nome do tópico Pub/Sub para roteamento de erros"
  default     = "dieta-ai-errors-dev"
}

variable "subscription_name" {
  type        = string
  description = "Nome da subscription do Pub/Sub para o worker de auto-cura"
  default     = "dieta-ai-errors-dev-sub"
}

resource "google_pubsub_topic" "errors" {
  project = var.project_id
  name    = var.topic_name

  labels = {
    app        = "dieta-ai"
    purpose    = "self-healing-telemetry"
    managed_by = "terraform"
  }
}

resource "google_pubsub_subscription" "errors_sub" {
  project = var.project_id
  name    = var.subscription_name
  topic   = google_pubsub_topic.errors.name

  # Retenção de mensagens por até 7 dias para auditoria e auto-correção
  message_retention_duration = "604800s"
  ack_deadline_seconds       = 60

  expiration_policy {
    ttl = "" # Nunca expira
  }

  retry_policy {
    minimum_backoff = "10s"
    maximum_backoff = "600s"
  }

  labels = {
    app        = "dieta-ai"
    consumer   = "error-healer-worker"
    managed_by = "terraform"
  }
}

output "topic_name" {
  value       = google_pubsub_topic.errors.name
  description = "Nome do tópico Pub/Sub"
}

output "topic_id" {
  value       = google_pubsub_topic.errors.id
  description = "ID do tópico Pub/Sub"
}

output "subscription_name" {
  value       = google_pubsub_subscription.errors_sub.name
  description = "Nome da subscription Pub/Sub"
}
