# Changes in ./docker-entrypoint-initdb.d/mongo-init.js only works on a fresh container initialization.
# Therefore delete it first and recreate a new one
force-delete-databases:
	docker-compose rm -f