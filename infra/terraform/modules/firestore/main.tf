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
  description = "Região GCP (Obrigatoriamente us-central1 para Free Tier)"
  default     = "us-central1"

  validation {
    condition     = var.region == "us-central1"
    error_message = "Regra inquebrável: Firestore deve residir exclusivamente em us-central1 para elegibilidade ao Free Tier contínuo."
  }
}

variable "database_name" {
  type        = string
  description = "Nome do banco de dados Firestore"
  default     = "(default)"
}

variable "rules_file_path" {
  type        = string
  description = "Caminho do arquivo firestore.rules para isolamento de segurança"
  default     = ""
}

variable "enable_security_rules" {
  type        = bool
  description = "Habilitar deploy de regras de segurança via Firebase Rules API (requer permissão roles/firebaserules.admin)"
  default     = false
}

locals {
  default_rules_path  = fileexists("${path.module}/../../../../firestore.rules") ? "${path.module}/../../../../firestore.rules" : "${path.module}/firestore.rules"
  resolved_rules_path = var.rules_file_path != "" ? var.rules_file_path : local.default_rules_path
}

resource "google_project_service" "firestore" {
  project            = var.project_id
  service            = "firestore.googleapis.com"
  disable_on_destroy = false
}

resource "google_firestore_database" "database" {
  project                     = var.project_id
  name                        = var.database_name
  location_id                 = var.region
  type                        = "FIRESTORE_NATIVE"
  concurrency_mode            = "OPTIMISTIC"
  app_engine_integration_mode = "DISABLED"
  delete_protection_state     = "DELETE_PROTECTION_ENABLED"

  depends_on = [google_project_service.firestore]
}

resource "google_firebaserules_ruleset" "firestore" {
  count   = var.enable_security_rules ? 1 : 0
  project = var.project_id
  source {
    files {
      name    = "firestore.rules"
      content = file(local.resolved_rules_path)
    }
  }

  depends_on = [google_firestore_database.database]
}

resource "google_firebaserules_release" "firestore" {
  count        = var.enable_security_rules ? 1 : 0
  project      = var.project_id
  name         = "cloud.firestore"
  ruleset_name = "projects/${var.project_id}/rulesets/${google_firebaserules_ruleset.firestore[0].name}"

  depends_on = [google_firebaserules_ruleset.firestore]
}

output "database_name" {
  value       = google_firestore_database.database.name
  description = "Nome do Firestore database"
}

output "location_id" {
  value       = google_firestore_database.database.location_id
  description = "Localização do Firestore"
}
