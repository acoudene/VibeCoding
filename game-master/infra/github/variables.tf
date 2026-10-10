variable "owner" {
  description = "Propriétaire GitHub (utilisateur ou organisation)."
  type        = string
  default     = "acoudene"
}

variable "repository" {
  description = "Nom du dépôt."
  type        = string
  default     = "VibeCoding"
}

variable "ruleset_enforcement" {
  description = "`evaluate` (audit sans blocage) ou `active`. Commencer par `evaluate`."
  type        = string
  default     = "evaluate"

  validation {
    condition     = contains(["evaluate", "active", "disabled"], var.ruleset_enforcement)
    error_message = "Valeurs permises : evaluate, active, disabled."
  }
}

variable "required_approvals" {
  description = "Nombre d'approbations requises (0 si un seul mainteneur ne peut pas approuver sa propre PR)."
  type        = number
  default     = 0
}

variable "required_checks" {
  description = "Contextes de checks requis (ex. [\"verify\", \"infra-validate\"]). Vide par défaut : le workflow est filtré par chemin et bloquerait les PR des autres projets du monorepo."
  type        = list(string)
  default     = []
}
