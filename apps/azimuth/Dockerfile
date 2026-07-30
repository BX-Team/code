FROM gcr.io/distroless/cc-debian12:nonroot

LABEL org.opencontainers.image.source="https://github.com/BX-Team/code"
LABEL org.opencontainers.image.title="azimuth"
LABEL org.opencontainers.image.description="BX Team application API"
LABEL org.opencontainers.image.licenses="AGPL-3.0-only"

COPY staging/azimuth /usr/local/bin/azimuth

USER nonroot
ENTRYPOINT ["/usr/local/bin/azimuth"]
