ARG GOTENBERG_IMAGE=gotenberg/gotenberg:8.25.1
FROM ${GOTENBERG_IMAGE}

USER root

RUN echo "ttf-mscorefonts-installer msttcorefonts/accepted-mscorefonts-eula select true" | debconf-set-selections \
    && apt-get update -qq \
    && DEBIAN_FRONTEND=noninteractive apt-get install -y -qq --no-install-recommends ttf-mscorefonts-installer \
    && fc-cache -f \
    && fc-match Arial | grep -qi "Arial" \
    && rm -rf /var/lib/apt/lists/*

USER gotenberg

EXPOSE 3000
