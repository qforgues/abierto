@if "%DEBUG%" == "" @echo off
@rem Gradle wrapper for Windows

setlocal enabledelayedexpansion

set GRADLE_VERSION=8.1.2
set GRADLE_USER_HOME=%USERPROFILE%\.gradle
set GRADLE_HOME=%GRADLE_USER_HOME%\wrapper\dists\gradle-%GRADLE_VERSION%

if not exist "%GRADLE_HOME%" (
  echo Downloading Gradle %GRADLE_VERSION%...
  powershell -Command "(New-Object System.Net.ServicePointManager).SecurityProtocol = [System.Net.ServicePointManager]::SecurityProtocol -bor 3072; Invoke-WebRequest -Uri 'https://services.gradle.org/distributions/gradle-%GRADLE_VERSION%-bin.zip' -OutFile '%GRADLE_USER_HOME%\wrapper\gradle-%GRADLE_VERSION%-bin.zip'"
  powershell -Command "Expand-Archive -Path '%GRADLE_USER_HOME%\wrapper\gradle-%GRADLE_VERSION%-bin.zip' -DestinationPath '%GRADLE_USER_HOME%\wrapper\dists'"
)

set PATH=%GRADLE_HOME%\gradle-%GRADLE_VERSION%\bin;%PATH%

gradle %*
