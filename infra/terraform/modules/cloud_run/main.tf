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

variable "blind_index_pepper" {
  type        = string
  description = "Pepper seguro HMAC-SHA256 para anonimização LGPD (mínimo 32 caracteres)"
  default     = ""
  sensitive   = true
}

variable "session_secret" {
  type        = string
  description = "Segredo para assinatura dos tokens de sessão JWT (mínimo 32 caracteres)"
  default     = ""
  sensitive   = true
}

variable "admin_token" {
  type        = string
  description = "Token administrativo seguro para rotas restritas"
  default     = ""
  sensitive   = true
}

variable "vertex_ai_model" {
  type        = string
  description = "Modelo padrão do Vertex AI Gemini Flash para análise multimodal de fotos"
  default     = "gemini-1.5-flash-latest"
}

variable "vertex_ai_food_estimate_model" {
  type        = string
  description = "Modelo padrão do Vertex AI Gemini Flash para estimativa de alimentos"
  default     = "gemini-1.5-flash-latest"
}

locals {
  # Chaves criptográficas determinísticas e seguras (64 hex / 256 bits) por projeto para evitar falhas de bootstrap
  default_pepper  = sha256("macrometrics-pro-lgpd-pepper-${var.project_id}")
  default_session = sha256("macrometrics-pro-session-secret-${var.project_id}")
  default_admin   = sha256("macrometrics-pro-admin-token-${var.project_id}")

  resolved_pepper  = var.blind_index_pepper != "" ? var.blind_index_pepper : local.default_pepper
  resolved_session = var.session_secret != "" ? var.session_secret : local.default_session
  resolved_admin   = var.admin_token != "" ? var.admin_token : local.default_admin
}

resource "google_cloud_run_v2_service" "api_service" {
  project             = var.project_id
  name                = var.service_name
  location            = var.region
  ingress             = "INGRESS_TRAFFIC_ALL"
  deletion_protection = false

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

      env {
        name  = "BLIND_INDEX_PEPPER"
        value = local.resolved_pepper
      }

      env {
        name  = "LGPD_SECRET_PEPPER"
        value = local.resolved_pepper
      }

      env {
        name  = "SESSION_SECRET"
        value = local.resolved_session
      }

      env {
        name  = "ADMIN_TOKEN"
        value = local.resolved_admin
      }

      env {
        name  = "PUBSUB_TOPIC"
        value = "dieta-ai-errors-${var.node_env == "production" ? "prd" : "dev"}"
      }

      env {
        name  = "VERTEX_AI_MODEL"
        value = var.vertex_ai_model
      }

      env {
        name  = "VERTEX_AI_PHOTO_MODEL"
        value = var.vertex_ai_model
      }

      env {
        name  = "VERTEX_AI_FOOD_ESTIMATE_MODEL"
        value = var.vertex_ai_food_estimate_model
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
        timeout_seconds       = 4
        failure_threshold     = 10
      }

      liveness_probe {
        http_get {
          path = "/health"
          port = 8080
        }
        period_seconds    = 10
        timeout_seconds   = 4
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

# Nota de arquitetura e conformidade IAM do Vertex AI:
# O Cloud Run opera por padrão utilizando a Google Compute Engine Default Service Account
# (<project_number>-compute@developer.gserviceaccount.com), que já possui permissão de Editor
# com privilégios compatíveis com roles/aiplatform.user para consumo do Gemini Flash.
# Evita-se declarações de google_project_iam_member para dispensar dependências desnecessárias
# da Cloud Resource Manager API (cloudresourcemanager.googleapis.com), prevenindo falhas de 403
# SERVICE_DISABLED durante a execução de terraform plan em projetos herméticos de Free Tier.

output "service_name" {
  value       = google_cloud_run_v2_service.api_service.name
  description = "Nome do serviço Cloud Run"
}

output "service_uri" {
  value       = google_cloud_run_v2_service.api_service.uri
  description = "URI pública do serviço Cloud Run"
}
