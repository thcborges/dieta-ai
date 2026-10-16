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

variable "region" {
  type        = string
  description = "Região GCP (Obrigatoriamente us-central1)"
  default     = "us-central1"

  validation {
    condition     = var.region == "us-central1"
    error_message = "Regra inquebrável: todos os recursos GCP devem residir exclusivamente em us-central1 para elegibilidade ao Free Tier."
  }
}

variable "repository_id" {
  type        = string
  description = "ID do repositório no Artifact Registry"
  default     = "dieta-ai"
}

resource "google_artifact_registry_repository" "repo" {
  project       = var.project_id
  location      = var.region
  repository_id = var.repository_id
  description   = "Docker repository para imagens do MacroMetrics Pro (Cloud Run)"
  format        = "DOCKER"

  labels = {
    app         = "dieta-ai"
    environment = var.project_id
    managed_by  = "terraform"
  }
}

output "repository_id" {
  value       = google_artifact_registry_repository.repo.repository_id
  description = "ID do Artifact Registry repository"
}

output "repository_url" {
  value       = "${var.region}-docker.pkg.dev/${var.project_id}/${google_artifact_registry_repository.repo.repository_id}"
  description = "URL base do repositório Docker"
}
