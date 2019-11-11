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
  type = "string"
  default = "tigers-bot-sg"
}

variable "role" {
  type    = "string"
  default = "tigers-bot"
}

variable "aws_launch_config" {
  type = "map"

  default = {
    instance_ami  = "ami-04152c3a27c49a944"
    instance_type = "t2.micro"
    root_size     = 8
    key_name      = "tigers-keys"
  }
}

variable "BOT_TOKEN" {}
variable "MONGO_URI" {}
