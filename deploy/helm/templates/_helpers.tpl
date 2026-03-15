{{/*
Expand the name of the chart.
*/}}
{{- define "contextstream.name" -}}
{{- default .Chart.Name .Values.nameOverride | trunc 63 | trimSuffix "-" }}
{{- end }}

{{/*
Create a default fully qualified app name.
We truncate at 63 chars because some Kubernetes name fields are limited to this (by the DNS naming spec).
If release name contains chart name it will be used as a full name.
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
Common labels applied to all resources.
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
Selector labels for the app component.
*/}}
{{- define "contextstream.selectorLabels" -}}
app.kubernetes.io/name: {{ include "contextstream.name" . }}
app.kubernetes.io/instance: {{ .Release.Name }}
{{- end }}

{{/*
Selector labels for the worker component.
*/}}
{{- define "contextstream.workerSelectorLabels" -}}
app.kubernetes.io/name: {{ include "contextstream.name" . }}-worker
app.kubernetes.io/instance: {{ .Release.Name }}
{{- end }}

{{/*
Selector labels for the pdf-parser component.
*/}}
{{- define "contextstream.pdfParserSelectorLabels" -}}
app.kubernetes.io/name: {{ include "contextstream.name" . }}-pdf-parser
app.kubernetes.io/instance: {{ .Release.Name }}
{{- end }}

{{/*
Create the name of the service account to use.
*/}}
{{- define "contextstream.serviceAccountName" -}}
{{- if .Values.serviceAccount.create }}
{{- default (include "contextstream.fullname" .) .Values.serviceAccount.name }}
{{- else }}
{{- default "default" .Values.serviceAccount.name }}
{{- end }}
{{- end }}
