terraform {
  required_version = ">= 1.8.0"

  required_providers {
    github = {
      source  = "integrations/github"
      version = "~> 6.0"
    }
  }

  # État distant sur Cloudflare R2 (API S3-compatible) — ADR-0012.
  # Valeurs fournies à l'init : voir README.md (aucun identifiant n'est commité).
  backend "s3" {
    key                         = "github/vibecoding.tfstate"
    region                      = "auto"
    skip_credentials_validation = true
    skip_region_validation      = true
    skip_requesting_account_id  = true
    skip_metadata_api_check     = true
    skip_s3_checksum            = true
    use_path_style              = true
  }
}

# Authentification : variable d'environnement GITHUB_TOKEN (PAT fine-grained, jamais commité).
provider "github" {
  owner = var.owner
}

data "github_repository" "this" {
  name = var.repository
}

# Protection de la branche par défaut (ADR-0011). S'applique au dépôt entier (monorepo).
resource "github_repository_ruleset" "protect_default_branch" {
  name        = "protect-main"
  repository  = data.github_repository.this.name
  target      = "branch"
  enforcement = var.ruleset_enforcement

  conditions {
    ref_name {
      include = ["~DEFAULT_BRANCH"]
      exclude = []
    }
  }

  rules {
    deletion                = true
    non_fast_forward        = true
    required_linear_history = true

    pull_request {
      required_approving_review_count   = var.required_approvals
      dismiss_stale_reviews_on_push     = true
      require_code_owner_review         = false
      required_review_thread_resolution = true
    }

    dynamic "required_status_checks" {
      for_each = length(var.required_checks) > 0 ? [1] : []
      content {
        strict_required_status_checks_policy = true
        dynamic "required_check" {
          for_each = var.required_checks
          content {
            context = required_check.value
          }
        }
      }
    }
  }
}
