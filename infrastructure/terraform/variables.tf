variable "aws_config" {
  type = "map"

  default = {
    "region"                 = "us-east-2"
    "auto_scaling_group_min" = 1
    "auto_scaling_group_max" = 1
  }
}

variable "aws_availability_zone" {
  type    = "string"
  default = "us-east-2a"
}

variable "aws_security_groups" {
  type = "list"

  default = [
    "tigers-bot-sg",
  ]
}

variable "role" {
  type    = "string"
  default = "tigers-bot"
}

variable "aws_launch_config" {
  type = "map"

  default = {
    instance_ami  = "ami-922914f7"
    instance_type = "t2.micro"
    root_size     = 8
    key_name      = "aws-tigers"
  }
}

variable "BOT_TOKEN" {}
variable "MONGO_URI" {}
