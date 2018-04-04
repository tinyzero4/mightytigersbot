variable "aws_config" {
  type = "map",
  default = {
    "region" = "us-east-1"
    "auto_scaling_group_min" = 1
    "auto_scaling_group_max" = 1
  }
}

variable "aws_availability_zones" {
  type = "list"
  default = [
    "us-east-1a"
  ]
}

variable "aws_security_groups" {
  type = "list"
  # Open ports 80
  default = [
    "sg-df53bc96"
  ]
}

variable "role" {
  type = "string"
  default = "tigers-bot"
}

variable "aws_launch_config" {

  type = "map"
  default = {
    # Amazon Linux AMI 2017.09.1 (HVM), SSD Volume Type - ami-25615740
    instance_ami = "ami-428aa838"
    instance_type = "t2.micro"
    root_size = 8
    key_name = "tigersbot"
  }
}

variable "tg_bot_token" {}