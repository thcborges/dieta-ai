terraform {
  required_version = ">= 1.5.0"
  required_providers {
    google = {
      source  = "hashicorp/google"
      version = ">= 5.0.0"
    }
  }
  backend "gcs" {
    bucket = "thcborges-dieta-ai-prd-terraform-state"
    prefix = "terraform/state/prd"
  }
}

import {
  to = module.firestore.google_firestore_database.database
  id = "projects/thcborges-dieta-ai-prd/databases/(default)"
}

import {
  to = module.artifact_registry.google_artifact_registry_repository.repo
  id = "projects/thcborges-dieta-ai-prd/locations/us-central1/repositories/dieta-ai"
}

import {
  to = module.pubsub.google_pubsub_topic.errors
  id = "projects/thcborges-dieta-ai-prd/topics/dieta-ai-errors-prd"
}

import {
  to = module.pubsub.google_pubsub_subscription.errors_sub
  id = "projects/thcborges-dieta-ai-prd/subscriptions/dieta-ai-errors-prd-sub"
}

provider "google" {
  project = var.project_id
  region  = var.region
}

variable "project_id" {
  type        = string
  description = "GCP Project ID para ambiente de produção"
  default     = "thcborges-dieta-ai-prd"
}

variable "region" {
  type        = string
  description = "Região GCP estritamente us-central1 (Free Tier)"
  default     = "us-central1"
}

# 1. Repositório de Containers (Artifact Registry)
module "artifact_registry" {
  source     = "../../modules/artifact_registry"
  project_id = var.project_id
  region     = var.region
}

# 2. Banco de Dados Firestore (Native Mode em us-central1)
module "firestore" {
  source     = "../../modules/firestore"
  project_id = var.project_id
  region     = var.region
}

# 3. Fila Pub/Sub para roteamento de erros de produção
module "pubsub" {
  source            = "../../modules/pubsub"
  project_id        = var.project_id
  topic_name        = "dieta-ai-errors-prd"
  subscription_name = "dieta-ai-errors-prd-sub"
}

# 4. Cloud Logging Metric Sink para envio de erros críticos ao Pub/Sub
module "logging_sink" {
  source          = "../../modules/logging_sink"
  project_id      = var.project_id
  sink_name       = "dieta-ai-prd-error-sink"
  pubsub_topic_id = module.pubsub.topic_id
}

# 5. Serviço Cloud Run (Fastify API, scale-to-zero, 256MB RAM)
module "cloud_run" {
  source                = "../../modules/cloud_run"
  project_id            = var.project_id
  region                = var.region
  service_name          = "dieta-ai-api-prd"
  image_url             = "${module.artifact_registry.repository_url}/api:stable"
  node_env              = "production"
  allow_unauthenticated = true
}

output "prd_cloud_run_uri" {
  value       = module.cloud_run.service_uri
  description = "URI pública do ambiente de produção"
}
