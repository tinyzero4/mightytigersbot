provider "aws" {
  region = "${var.aws_config["region"]}"
}

data "aws_eip" "tigers_bot_eip" {
}

resource "aws_instance" "tigers_bot_handler" {
  ami = "${var.aws_launch_config["instance_ami"]}"
  instance_type = "${var.aws_launch_config["instance_type"]}"
  key_name = "${var.aws_launch_config["key_name"]}"

  root_block_device {
    volume_type = "standard"
    volume_size = "${var.aws_launch_config["root_size"]}"
  }

  availability_zone = "${var.aws_availability_zone}"

  security_groups = [
    "${var.aws_security_groups}"
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
- echo "export TG_BOT_TOKEN=\"${var.tg_bot_token}\"" >> /home/ec2-user/.bash_profile
- echo "export WEBHOOK_HOST=\"${data.aws_eip.tigers_bot_eip.public_ip}\"" >> /home/ec2-user/.bash_profile
EOF
}

resource "aws_eip_association" "tigers_bot_eip_association" {
  instance_id = "${aws_instance.tigers_bot_handler.id}"
  allocation_id = "${data.aws_eip.tigers_bot_eip.id}"
}