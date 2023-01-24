SHELL=bash
include .env

dev:
	docker-compose -f docker-compose.yml up -d
