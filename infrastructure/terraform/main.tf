provider "aws" {
  access_key = "${var.aws_access_key_id}"
  secret_key = "${var.aws_secret_access_key}"
  region = "${var.aws_config["region"]}"
}

resource "aws_launch_configuration" "main" {
  name_prefix = "${var.role}-"
  image_id = "${var.aws_launch_config["instance_ami"]}"
  instance_type = "${var.aws_launch_config["instance_type"]}"
  key_name = "${var.aws_launch_config["key_name"]}"

  root_block_device {
    volume_type = "standard"
    volume_size = "${var.aws_launch_config["root_size"]}"
  }

  security_groups = [
    "${var.aws_security_groups}"
  ]

  lifecycle {
    create_before_destroy = true
  }

  user_data = <<EOF
#cloud-config
disable_root: false
EOF
}

resource "aws_autoscaling_group" "main" {
  name = "${var.role}"

  max_size = "${var.aws_config["auto_scaling_group_max"]}"
  min_size = "${var.aws_config["auto_scaling_group_min"]}"

  launch_configuration = "${aws_launch_configuration.main.name}"

  tag {
    key = "Type"
    value = "${var.role}"
    propagate_at_launch = false
  }
}