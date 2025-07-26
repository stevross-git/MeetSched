# Use official PostgreSQL image
FROM postgres:15-alpine

# Set environment variables
ENV POSTGRES_DB=aibookme
ENV POSTGRES_USER=aibookme_user
ENV POSTGRES_PASSWORD=your_secure_password
ENV PGDATA=/var/lib/postgresql/data/pgdata

# Install additional extensions
RUN apk add --no-cache \
    postgresql-contrib \
    curl

# Create custom initialization directory
COPY docker/postgres/init/ /docker-entrypoint-initdb.d/

# Copy custom PostgreSQL configuration
COPY docker/postgres/postgresql.conf /etc/postgresql/postgresql.conf
COPY docker/postgres/pg_hba.conf /etc/postgresql/pg_hba.conf

# Set proper permissions
USER postgres

# Expose PostgreSQL port
EXPOSE 5432

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD pg_isready -U $POSTGRES_USER -d $POSTGRES_DB || exit 1

# Use custom entrypoint if needed
# COPY docker/postgres/docker-entrypoint.sh /usr/local/bin/
# RUN chmod +x /usr/local/bin/docker-entrypoint.sh
# ENTRYPOINT ["docker-entrypoint.sh"]

CMD ["postgres", "-c", "config_file=/etc/postgresql/postgresql.conf"]