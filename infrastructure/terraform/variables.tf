variable "aws_config" {
  type = "map",
  default = {
    "region" = "us-east-1"
    "auto_scaling_group_min" = 1
    "auto_scaling_group_max" = 1
  }
}

variable "aws_availability_zone" {
  type = "string"
  default = "us-east-1a"
}

variable "aws_security_groups" {
  type = "list"
  # Open ports 80
  default = [
    "tigersbot"
    #  corresponds to sg-df53bc96
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
    instance_ami = "ami-1853ac65"
    instance_type = "t2.micro"
    root_size = 8
    key_name = "tigersbot"
  }
}

variable "tg_bot_token" {
}

variable "tg_mongo_uri" {
  type = "string"
  default = "mongodb://127.0.0.1/tigers"
}