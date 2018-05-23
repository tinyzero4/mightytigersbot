provider "aws" {
  region = "${var.aws_config["region"]}"
}

data "aws_eip" "tigers_bot_eip" {}

resource "aws_instance" "tigers_bot_instance" {
  ami           = "${var.aws_launch_config["instance_ami"]}"
  instance_type = "${var.aws_launch_config["instance_type"]}"
  key_name      = "${var.aws_launch_config["key_name"]}"

  root_block_device {
    volume_type = "standard"
    volume_size = "${var.aws_launch_config["root_size"]}"
  }

  availability_zone = "${var.aws_availability_zone}"

  security_groups = [
    "${var.aws_security_groups}",
  ]

  tags {
    Type = "${var.role}"
  }

  lifecycle {
    create_before_destroy = true
  }

  user_data = <<EOF
#cloud-config

disable_root: false
runcmd:
- echo "export BOT_TOKEN=\"${var.BOT_TOKEN}\"" >> /home/ec2-user/.bash_profile
EOF
}

resource "aws_eip_association" "tigers_bot_eip_association" {
  instance_id   = "${aws_instance.tigers_bot_instance.id}"
  allocation_id = "${data.aws_eip.tigers_bot_eip.id}"
}
