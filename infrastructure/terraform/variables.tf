variable "aws_access_key_id" {
}

variable "aws_secret_access_key" {
}

variable "aws_config" {
  type = "map",
  default = {
    "region" = "us-east-1"
    "auto_scaling_group_min" = 1
    "auto_scaling_group_max" = 1
  }
}

variable "aws_security_groups" {
  type = "list"
  default = [
    "sg-110e2a7a" # Open ports 80,22
  ]
}

variable "role" {
  type = "string"
  default = "tigers-bot"
}

variable "aws_launch_config" { # Free tier only
  type = "map"
  default  = {
    instance_ami   = "ami-b73b63a0" # Amazon Linux AMI 2017.09.1 (HVM), SSD Volume Type - ami-25615740
    instance_type  = "t2.micro"
    root_size      = 8
    key_name = "tigerskey"
  }
}