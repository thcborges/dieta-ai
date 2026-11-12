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
    error_message = "Regra inquebrável: Vertex AI deve operar exclusivamente em us-central1 para consistência regional com Cloud Run e Firestore."
  }
}

variable "cloud_run_service_account" {
  type        = string
  description = "E-mail do Service Account do Cloud Run que consumirá os modelos Gemini via Vertex AI. Se vazio, será resolvido automaticamente para a Default Compute Engine SA do projeto."
  default     = ""
}

# -----------------------------------------------------------------------------
# Catálogo de Modelos do Vertex AI disponibilizados via Terraform
# -----------------------------------------------------------------------------

variable "primary_model" {
  type        = string
  description = "Modelo padrão do Vertex AI Gemini Flash disponibilizado para inferência"
  default     = "gemini-2.5-flash-image"
}

variable "food_estimate_model" {
  type        = string
  description = "Modelo padrão do Vertex AI disponibilizado para estimativa nutricional de alimentos"
  default     = "gemini-2.5-flash-image"
}

variable "photo_analysis_model" {
  type        = string
  description = "Modelo padrão do Vertex AI disponibilizado para análise multimodal de fotos de refeições"
  default     = "gemini-2.5-flash-image"
}

variable "fallback_models" {
  type        = list(string)
  description = "Lista ordenada de modelos do Vertex AI disponíveis na região us-central1"
  default = [
    "gemini-3.7-flash",
    "gemini-3.6-flash",
    "gemini-3.5-flash",
    "gemini-2.5-flash"
  ]
}

# 1. Habilitação da Cloud Resource Manager API (pré-requisito para gerenciamento de IAM via Terraform)
resource "google_project_service" "cloudresourcemanager" {
  project            = var.project_id
  service            = "cloudresourcemanager.googleapis.com"
  disable_on_destroy = false
}

# 2. Habilitação da API Vertex AI (AI Platform)
resource "google_project_service" "aiplatform" {
  project            = var.project_id
  service            = "aiplatform.googleapis.com"
  disable_on_destroy = false
}

# 3. Resolução do Project Number para derivar a Default Compute Engine SA quando não informada explicitamente
data "google_project" "current" {
  project_id = var.project_id

  depends_on = [
    google_project_service.cloudresourcemanager,
  ]
}

locals {
  # Se o caller informou um SA explícito, usa-o; senão, resolve para a Default Compute Engine SA
  resolved_service_account = (
    var.cloud_run_service_account != ""
    ? var.cloud_run_service_account
    : "${data.google_project.current.number}-compute@developer.gserviceaccount.com"
  )

  fallback_models_joined = join(",", var.fallback_models)
}

# 4. Concessão explícita de roles/aiplatform.user ao Service Account do Cloud Run
#    Garante que o Cloud Run tenha permissão para invocar modelos Gemini via Vertex AI,
#    sem depender da permissão implícita do papel Editor da Default Compute SA.
resource "google_project_iam_member" "cloud_run_vertex_ai_user" {
  project = var.project_id
  role    = "roles/aiplatform.user"
  member  = "serviceAccount:${local.resolved_service_account}"

  depends_on = [
    google_project_service.aiplatform,
    google_project_service.cloudresourcemanager,
  ]
}

output "aiplatform_api_enabled" {
  value       = google_project_service.aiplatform.service
  description = "API Vertex AI habilitada no projeto"
}

output "vertex_ai_service_account" {
  value       = local.resolved_service_account
  description = "Service Account com roles/aiplatform.user para consumo do Vertex AI"
}

output "primary_model" {
  value       = var.primary_model
  description = "Modelo primário disponibilizado pelo Vertex AI"
}

output "food_estimate_model" {
  value       = var.food_estimate_model
  description = "Modelo disponibilizado para estimativa de alimentos"
}

output "photo_analysis_model" {
  value       = var.photo_analysis_model
  description = "Modelo disponibilizado para análise multimodal de fotos"
}

output "fallback_models" {
  value       = local.fallback_models_joined
  description = "Modelos de fallback disponibilizados, separados por vírgula para injeção em env var"
}

output "supported_models" {
  value       = concat([var.primary_model], var.fallback_models)
  description = "Lista completa de todos os modelos Gemini suportados e disponibilizados pelo módulo"
}
