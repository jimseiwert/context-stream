{{/*
Expand the name of the chart.
*/}}
{{- define "contextstream.name" -}}
{{- default .Chart.Name .Values.nameOverride | trunc 63 | trimSuffix "-" }}
{{- end }}

{{/*
Create a default fully qualified app name.
*/}}
{{- define "contextstream.fullname" -}}
{{- if .Values.fullnameOverride }}
{{- .Values.fullnameOverride | trunc 63 | trimSuffix "-" }}
{{- else }}
{{- $name := default .Chart.Name .Values.nameOverride }}
{{- if contains $name .Release.Name }}
{{- .Release.Name | trunc 63 | trimSuffix "-" }}
{{- else }}
{{- printf "%s-%s" .Release.Name $name | trunc 63 | trimSuffix "-" }}
{{- end }}
{{- end }}
{{- end }}

{{/*
Create chart name and version as used by the chart label.
*/}}
{{- define "contextstream.chart" -}}
{{- printf "%s-%s" .Chart.Name .Chart.Version | replace "+" "_" | trunc 63 | trimSuffix "-" }}
{{- end }}

{{/*
Common labels
*/}}
{{- define "contextstream.labels" -}}
helm.sh/chart: {{ include "contextstream.chart" . }}
{{ include "contextstream.selectorLabels" . }}
{{- if .Chart.AppVersion }}
app.kubernetes.io/version: {{ .Chart.AppVersion | quote }}
{{- end }}
app.kubernetes.io/managed-by: {{ .Release.Service }}
{{- end }}

{{/*
Selector labels
*/}}
{{- define "contextstream.selectorLabels" -}}
app.kubernetes.io/name: {{ include "contextstream.name" . }}
app.kubernetes.io/instance: {{ .Release.Name }}
{{- end }}

{{/*
Create the name of the service account to use
*/}}
{{- define "contextstream.serviceAccountName" -}}
{{- if .Values.serviceAccount.create }}
{{- default (include "contextstream.fullname" .) .Values.serviceAccount.name }}
{{- else }}
{{- default "default" .Values.serviceAccount.name }}
{{- end }}
{{- end }}

{{/*
PostgreSQL host
*/}}
{{- define "contextstream.postgresql.host" -}}
{{- if .Values.externalDatabase.enabled }}
{{- .Values.externalDatabase.host }}
{{- else }}
{{- printf "%s-postgresql" (include "contextstream.fullname" .) }}
{{- end }}
{{- end }}

{{/*
PostgreSQL port
*/}}
{{- define "contextstream.postgresql.port" -}}
{{- if .Values.externalDatabase.enabled }}
{{- .Values.externalDatabase.port }}
{{- else }}
{{- "5432" }}
{{- end }}
{{- end }}

{{/*
PostgreSQL database URL
*/}}
{{- define "contextstream.database.url" -}}
{{- if .Values.externalDatabase.enabled }}
{{- printf "postgresql://%s:%s@%s:%v/%s" .Values.externalDatabase.username .Values.externalDatabase.password .Values.externalDatabase.host .Values.externalDatabase.port .Values.externalDatabase.database }}
{{- else }}
{{- printf "postgresql://%s:%s@%s:5432/%s" .Values.postgresql.auth.username .Values.postgresql.auth.password (include "contextstream.postgresql.host" .) .Values.postgresql.auth.database }}
{{- end }}
{{- end }}

{{/*
Redis host
*/}}
{{- define "contextstream.redis.host" -}}
{{- if .Values.externalRedis.enabled }}
{{- .Values.externalRedis.host }}
{{- else }}
{{- printf "%s-redis-master" (include "contextstream.fullname" .) }}
{{- end }}
{{- end }}

{{/*
Redis port
*/}}
{{- define "contextstream.redis.port" -}}
{{- if .Values.externalRedis.enabled }}
{{- .Values.externalRedis.port }}
{{- else }}
{{- "6379" }}
{{- end }}
{{- end }}

{{/*
Redis URL
*/}}
{{- define "contextstream.redis.url" -}}
{{- if .Values.externalRedis.enabled }}
{{- if .Values.externalRedis.password }}
{{- printf "redis://:%s@%s:%v" .Values.externalRedis.password .Values.externalRedis.host .Values.externalRedis.port }}
{{- else }}
{{- printf "redis://%s:%v" .Values.externalRedis.host .Values.externalRedis.port }}
{{- end }}
{{- else }}
{{- if .Values.redis.auth.enabled }}
{{- printf "redis://:%s@%s:6379" .Values.redis.auth.password (include "contextstream.redis.host" .) }}
{{- else }}
{{- printf "redis://%s:6379" (include "contextstream.redis.host" .) }}
{{- end }}
{{- end }}
{{- end }}
