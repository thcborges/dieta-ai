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
    error_message = "Regra inquebrável: Cloud Run deve ser implantado exclusivamente em us-central1 para elegibilidade ao Free Tier."
  }
}

variable "service_name" {
  type        = string
  description = "Nome do serviço Cloud Run"
  default     = "dieta-ai-api"
}

variable "image_url" {
  type        = string
  description = "URL da imagem de container para o serviço"
}

variable "node_env" {
  type        = string
  description = "NODE_ENV da aplicação"
  default     = "production"
}

variable "allow_unauthenticated" {
  type        = bool
  description = "Permitir invocação pública da API"
  default     = true
}

resource "google_cloud_run_v2_service" "api_service" {
  project  = var.project_id
  name     = var.service_name
  location = var.region
  ingress  = "INGRESS_TRAFFIC_ALL"

  template {
    scaling {
      min_instance_count = 0 # CRÍTICO: Escala para 0 instâncias no Free Tier
      max_instance_count = 5 # Trava máxima para evitar estouro acidental de cota
    }

    containers {
      image = var.image_url

      resources {
        limits = {
          cpu    = "1000m"
          memory = "256Mi" # Ultra-leve para Fastify sub-50ms cold-start
        }
        cpu_idle = true # CPU alocada apenas durante processamento de requisição
      }

      env {
        name  = "NODE_ENV"
        value = var.node_env
      }

      env {
        name  = "GCP_REGION"
        value = var.region
      }

      env {
        name  = "GCP_PROJECT_ID"
        value = var.project_id
      }

      ports {
        container_port = 8080
      }

      startup_probe {
        http_get {
          path = "/health"
          port = 8080
        }
        initial_delay_seconds = 2
        period_seconds        = 5
        failure_threshold     = 3
      }

      liveness_probe {
        http_get {
          path = "/health"
          port = 8080
        }
        period_seconds    = 10
        failure_threshold = 3
      }
    }
  }

  labels = {
    app        = "dieta-ai"
    component  = "backend-api"
    managed_by = "terraform"
  }
}

# Política IAM para acesso público ao endpoint da API
resource "google_cloud_run_v2_service_iam_member" "public_invoker" {
  count    = var.allow_unauthenticated ? 1 : 0
  project  = var.project_id
  location = var.region
  name     = google_cloud_run_v2_service.api_service.name
  role     = "roles/run.invoker"
  member   = "allUsers"
}

output "service_name" {
  value       = google_cloud_run_v2_service.api_service.name
  description = "Nome do serviço Cloud Run"
}

output "service_uri" {
  value       = google_cloud_run_v2_service.api_service.uri
  description = "URI pública do serviço Cloud Run"
}
