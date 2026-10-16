terraform {
  required_version = ">= 1.5.0"
  required_providers {
    google = {
      source  = "hashicorp/google"
      version = ">= 5.0.0"
    }
  }
}

provider "google" {
  project = var.project_id
  region  = var.region
}

variable "project_id" {
  type        = string
  description = "GCP Project ID para ambiente de desenvolvimento"
  default     = "thcborges-dieta-ai-dev"
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

# 3. Fila Pub/Sub para roteamento de erros estruturados (dieta-ai-errors-dev)
module "pubsub" {
  source            = "../../modules/pubsub"
  project_id        = var.project_id
  topic_name        = "dieta-ai-errors-dev"
  subscription_name = "dieta-ai-errors-dev-sub"
}

# 4. Cloud Logging Metric Sink para envio automático de erros ao Pub/Sub
module "logging_sink" {
  source          = "../../modules/logging_sink"
  project_id      = var.project_id
  pubsub_topic_id = module.pubsub.topic_name
}

# 5. Serviço Cloud Run (Fastify API, scale-to-zero, 256MB RAM)
module "cloud_run" {
  source                = "../../modules/cloud_run"
  project_id            = var.project_id
  region                = var.region
  service_name          = "dieta-ai-api-dev"
  image_url             = "${module.artifact_registry.repository_url}/api:latest"
  node_env              = "development"
  allow_unauthenticated = true
}

output "dev_cloud_run_uri" {
  value       = module.cloud_run.service_uri
  description = "URI pública do ambiente de desenvolvimento"
}

output "dev_pubsub_topic" {
  value       = module.pubsub.topic_name
  description = "Tópico de telemetria de erros para o AGY"
}
