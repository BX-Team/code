FROM gcr.io/distroless/cc-debian12:nonroot

LABEL org.opencontainers.image.source="https://github.com/BX-Team/code"
LABEL org.opencontainers.image.title="influx"
LABEL org.opencontainers.image.description="BX Team ingest gateway"
LABEL org.opencontainers.image.licenses="AGPL-3.0-only"

COPY staging/influx /usr/local/bin/influx

USER nonroot
ENTRYPOINT ["/usr/local/bin/influx"]
