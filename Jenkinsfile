def WEBHOOK_TRIGGER_TOKEN_CREDENTIAL_ID = 'GITHUB_WEBHOOK_TRIGGER_TOKEN'
def REPO_SLUG = 'nangman-infra/nangman-infra-meet'
def MAIN_BRANCH_REF = 'refs/heads/main'
def DEFAULT_REPO_HTTP_URL = 'https://github.com/nangman-infra/nangman-infra-meet.git'

pipeline {
    agent any

    parameters {
        booleanParam(
            name: 'FORCE_DEPLOY',
            defaultValue: false,
            description: 'frontend/backend 변경이 없어도 이미지 빌드, 푸시, 배포를 강제로 실행합니다.'
        )
    }

    triggers {
        // Project-specific webhook settings.
        GenericTrigger(
            genericVariables: [
                [key: 'GIT_REF', value: '$.ref', defaultValue: ''],
                [key: 'REPO_URL', value: '$.repository.clone_url', defaultValue: ''],
                [key: 'BEFORE_SHA', value: '$.before', defaultValue: ''],
                [key: 'AFTER_SHA', value: '$.after', defaultValue: '']
            ],
            tokenCredentialId: WEBHOOK_TRIGGER_TOKEN_CREDENTIAL_ID,
            causeString: 'nangman-infra-meet main push detected',
            regexpFilterText: '$REPO_URL $GIT_REF',
            regexpFilterExpression: ".*${REPO_SLUG}.* ${MAIN_BRANCH_REF}",
            printContributedVariables: true,
            printPostContent: true
        )
    }

    environment {
        // Project-specific settings. Change this block first when reusing this Jenkinsfile.
        HARBOR_URL = 'harbor.nangman.cloud'
        HARBOR_PROJECT = 'library'
        HARBOR_CREDS_ID = 'harbor-auth'

        FRONTEND_IMAGE_NAME = 'nangman-infra-meet-frontend'
        FRONTEND_IMAGE_REPO = "${HARBOR_URL}/${HARBOR_PROJECT}/${FRONTEND_IMAGE_NAME}"
        FRONTEND_IMAGE_CACHE = "${FRONTEND_IMAGE_REPO}:buildcache"
        FRONTEND_IMAGE_LATEST = "${FRONTEND_IMAGE_REPO}:latest"

        BACKEND_IMAGE_NAME = 'nangman-infra-meet-backend'
        BACKEND_IMAGE_REPO = "${HARBOR_URL}/${HARBOR_PROJECT}/${BACKEND_IMAGE_NAME}"
        BACKEND_IMAGE_CACHE = "${BACKEND_IMAGE_REPO}:buildcache"
        BACKEND_IMAGE_LATEST = "${BACKEND_IMAGE_REPO}:latest"

        WATCHTOWER_URL = 'http://172.16.0.14:18081'
        WATCHTOWER_TOKEN = credentials('nangman-infra-meet-watchtower-token')
        APP_HEALTH_URL = 'http://172.16.0.14:8082/api/v1/health'
        APP_HEALTH_EXPECTED_SERVICE = 'nangman-infra-meet-backend'
        DEPLOY_TIMEOUT_SECONDS = '180'
        SONARQUBE_INSTALLATION = 'sonarqube'
        SONAR_SCANNER_TOOL = 'SonarScanner'
        SONAR_PROJECT_KEY = 'nangman-infra-meet'
        SONAR_PROJECT_NAME = 'nangman-infra-meet'
        FRONTEND_COVERAGE_REPORT = 'frontend/coverage/lcov.info'
        BACKEND_COVERAGE_REPORT = 'backend/coverage/lcov.info'
        CI = 'true'

        DOCKER_BUILDKIT = '1'
        DOCKER_CLI_EXPERIMENTAL = 'enabled'
        PLATFORMS = 'linux/amd64,linux/arm64'
    }

    options {
        disableConcurrentBuilds()
        buildDiscarder(logRotator(numToKeepStr: '10'))
        timeout(time: 60, unit: 'MINUTES')
        timestamps()
        ansiColor('xterm')
    }

    stages {
        stage('Checkout') {
            steps {
                checkout scm
            }
        }

        stage('Initialize') {
            steps {
                script {
                    env.FULL_SHA = sh(script: 'git rev-parse HEAD', returnStdout: true).trim()
                    env.SHORT_SHA = sh(script: 'git rev-parse --short=12 HEAD', returnStdout: true).trim()
                    env.EXACT_GIT_TAG = sh(
                        script: 'git fetch --tags --force >/dev/null 2>&1 || true; git tag --points-at HEAD | head -n 1',
                        returnStdout: true
                    ).trim()
                    env.BUILD_TIMESTAMP = sh(
                        script: 'date -u +%Y-%m-%dT%H:%M:%SZ',
                        returnStdout: true
                    ).trim()
                    env.BUILD_REF = env.GIT_REF ?: MAIN_BRANCH_REF
                    env.REPO_HTTP_URL = env.REPO_URL?.trim()
                        ? env.REPO_URL.trim()
                        : DEFAULT_REPO_HTTP_URL

                    def hasBeforeSha = env.BEFORE_SHA?.trim() && sh(
                        script: "git cat-file -e ${env.BEFORE_SHA}^{commit} >/dev/null 2>&1",
                        returnStatus: true
                    ) == 0
                    def hasAfterSha = env.AFTER_SHA?.trim() && sh(
                        script: "git cat-file -e ${env.AFTER_SHA}^{commit} >/dev/null 2>&1",
                        returnStatus: true
                    ) == 0
                    def diffLabel
                    def changedFilesText

                    if (hasBeforeSha && hasAfterSha) {
                        diffLabel = "${env.BEFORE_SHA.take(12)}..${env.AFTER_SHA.take(12)}"
                        changedFilesText = sh(
                            script: "git diff --name-only ${env.BEFORE_SHA} ${env.AFTER_SHA}",
                            returnStdout: true
                        ).trim()
                    } else if (sh(script: 'git rev-parse HEAD^ >/dev/null 2>&1', returnStatus: true) == 0) {
                        diffLabel = 'HEAD^..HEAD'
                        changedFilesText = sh(
                            script: 'git diff --name-only HEAD^ HEAD',
                            returnStdout: true
                        ).trim()
                    } else {
                        diffLabel = 'full-tree'
                        changedFilesText = sh(
                            script: 'git ls-tree --name-only -r HEAD',
                            returnStdout: true
                        ).trim()
                    }

                    def changedFiles = changedFilesText ? changedFilesText.readLines() : []
                    def sharedPaths = ['docker-compose.yml', '.dockerignore'] as Set
                    def frontendChanged = diffLabel == 'full-tree' || changedFiles.any { path ->
                        path.startsWith('frontend/') || sharedPaths.contains(path)
                    }
                    def backendChanged = diffLabel == 'full-tree' || changedFiles.any { path ->
                        path.startsWith('backend/') || sharedPaths.contains(path)
                    }
                    def forceDeploy = params.FORCE_DEPLOY == true
                    def frontendBuildRequired = forceDeploy || frontendChanged
                    def backendBuildRequired = forceDeploy || backendChanged

                    env.FRONTEND_CHANGED = frontendChanged ? 'true' : 'false'
                    env.BACKEND_CHANGED = backendChanged ? 'true' : 'false'
                    env.FORCE_DEPLOY = forceDeploy ? 'true' : 'false'
                    env.FRONTEND_BUILD_REQUIRED = frontendBuildRequired ? 'true' : 'false'
                    env.BACKEND_BUILD_REQUIRED = backendBuildRequired ? 'true' : 'false'
                    env.DEPLOY_REQUIRED = (frontendBuildRequired || backendBuildRequired) ? 'true' : 'false'
                    env.FRONTEND_SHA_TAG = "${env.FRONTEND_IMAGE_REPO}:sha-${env.SHORT_SHA}"
                    env.BACKEND_SHA_TAG = "${env.BACKEND_IMAGE_REPO}:sha-${env.SHORT_SHA}"

                    currentBuild.displayName = "#${env.BUILD_NUMBER} ${env.SHORT_SHA}"
                    currentBuild.description = (
                        env.EXACT_GIT_TAG
                            ? "main -> ${env.EXACT_GIT_TAG}"
                            : "main -> sha-${env.SHORT_SHA}"
                    ) + " | frontend=${env.FRONTEND_CHANGED}, backend=${env.BACKEND_CHANGED}"

                    echo "Repository: ${env.REPO_HTTP_URL}"
                    echo "Branch ref: ${env.BUILD_REF}"
                    echo "Diff scope: ${diffLabel}"
                    echo "Changed files: ${changedFiles ? changedFiles.join(', ') : '(none)'}"
                    echo "Frontend image repository: ${env.FRONTEND_IMAGE_REPO}"
                    echo "Backend image repository: ${env.BACKEND_IMAGE_REPO}"
                    echo "Force deploy requested: ${env.FORCE_DEPLOY}"
                    echo "Frontend changed: ${env.FRONTEND_CHANGED}"
                    echo "Backend changed: ${env.BACKEND_CHANGED}"
                    echo "Frontend build required: ${env.FRONTEND_BUILD_REQUIRED}"
                    echo "Backend build required: ${env.BACKEND_BUILD_REQUIRED}"
                    echo "Image tags: latest, sha-${env.SHORT_SHA}${env.EXACT_GIT_TAG ? ", ${env.EXACT_GIT_TAG}" : ''}"

                    if (env.FORCE_DEPLOY == 'true') {
                        echo 'FORCE_DEPLOY=true 이므로 변경 파일과 관계없이 빌드, 푸시, 배포를 진행합니다.'
                    } else if (env.DEPLOY_REQUIRED != 'true') {
                        echo 'No deployable frontend/backend changes detected; build, push, and deploy stages will be skipped.'
                    }
                }
            }
        }

        stage('Notify Build Start') {
            steps {
                script {
                    def startMessage = ":hourglass_flowing_sand: 빌드를 시작합니다.\n프로젝트: ${env.JOB_NAME} #${env.BUILD_NUMBER}\n브랜치: ${env.BUILD_REF}\n태그: sha-${env.SHORT_SHA}"

                    if (env.FORCE_DEPLOY == 'true') {
                        startMessage += "\n실행 방식: 강제 배포"
                    } else if (env.DEPLOY_REQUIRED == 'true') {
                        startMessage += "\n실행 방식: 변경 감지 배포"
                    } else {
                        startMessage += "\n실행 방식: 품질 검증 전용"
                    }

                    try {
                        mattermostSend(
                            color: '#439FE0',
                            message: startMessage
                        )
                    } catch (err) {
                        echo "Mattermost start notification failed: ${err.getMessage()}"
                    }
                }
            }
        }

        stage('Install Test Dependencies') {
            options {
                timeout(time: 20, unit: 'MINUTES')
            }
            steps {
                sh '''
                    node --version
                    yarn --version
                    pnpm --version
                '''

                dir('frontend') {
                    sh 'yarn install --immutable'
                }

                dir('backend') {
                    sh 'pnpm install --frozen-lockfile'
                }
            }
        }

        stage('Test Coverage') {
            options {
                timeout(time: 20, unit: 'MINUTES')
            }
            steps {
                sh 'rm -rf frontend/coverage backend/coverage'

                dir('frontend') {
                    sh 'yarn test:coverage:ci'
                }

                dir('backend') {
                    sh 'pnpm test:coverage'
                }

                sh '''
                    perl -0pi -e 's#^SF:src/#SF:frontend/src/#mg' "$FRONTEND_COVERAGE_REPORT"
                    perl -0pi -e 's#^SF:src/#SF:backend/src/#mg' "$BACKEND_COVERAGE_REPORT"
                    test -f "$FRONTEND_COVERAGE_REPORT"
                    test -f "$BACKEND_COVERAGE_REPORT"
                '''
            }
        }

        stage('SonarQube Analysis') {
            steps {
                script {
                    def scannerHome = tool env.SONAR_SCANNER_TOOL

                    writeFile(
                        file: 'sonar-project.properties',
                        text: """
                            sonar.projectKey=${env.SONAR_PROJECT_KEY}
                            sonar.projectName=${env.SONAR_PROJECT_NAME}
                            sonar.projectVersion=sha-${env.SHORT_SHA}
                            sonar.projectBaseDir=.
                            sonar.sourceEncoding=UTF-8
                            sonar.scm.revision=${env.FULL_SHA}
                            sonar.sources=frontend/src,backend/src
                            sonar.tests=frontend/src,backend/test
                            sonar.test.inclusions=frontend/src/**/*.test.ts,frontend/src/**/*.test.tsx,frontend/src/**/*.spec.ts,frontend/src/**/*.spec.tsx,backend/test/**/*.spec.ts,backend/test/**/*.test.ts
                            sonar.exclusions=**/node_modules/**,**/dist/**,**/coverage/**,**/.yarn/**,**/.pnp.*,frontend/embedded/**,frontend/public/**,frontend/src/**/*.test.ts,frontend/src/**/*.test.tsx,frontend/src/**/*.spec.ts,frontend/src/**/*.spec.tsx
                            sonar.javascript.lcov.reportPaths=${env.FRONTEND_COVERAGE_REPORT},${env.BACKEND_COVERAGE_REPORT}
                        """.stripIndent().trim() + '\n'
                    )

                    withSonarQubeEnv(env.SONARQUBE_INSTALLATION) {
                        sh "\"${scannerHome}/bin/sonar-scanner\" -Dproject.settings=sonar-project.properties"
                    }
                }
            }
        }

        stage('Quality Gate') {
            steps {
                timeout(time: 30, unit: 'MINUTES') {
                    waitForQualityGate abortPipeline: true
                }
            }
        }

        stage('Setup Buildx') {
            when {
                expression { env.DEPLOY_REQUIRED == 'true' }
            }
            steps {
                sh '''
                    docker buildx version
                    docker buildx inspect multiarch-builder --bootstrap >/dev/null 2>&1 || \
                    docker buildx create --name multiarch-builder --use --platform linux/amd64,linux/arm64
                    docker buildx use multiarch-builder
                    docker buildx inspect multiarch-builder --bootstrap
                '''
            }
        }

        stage('Docker Build & Push Backend') {
            when {
                expression { env.BACKEND_BUILD_REQUIRED == 'true' }
            }
            options {
                timeout(time: 45, unit: 'MINUTES')
            }
            steps {
                script {
                    withCredentials([
                        usernamePassword(
                            credentialsId: env.HARBOR_CREDS_ID,
                            usernameVariable: 'HARBOR_USERNAME',
                            passwordVariable: 'HARBOR_PASSWORD'
                        )
                    ]) {
                        sh """
                            set -eu
                            echo "\$HARBOR_PASSWORD" | docker login ${env.HARBOR_URL} -u "\$HARBOR_USERNAME" --password-stdin
                        """

                        try {
                            def backendCacheFromArg = sh(
                                script: "docker buildx imagetools inspect ${env.BACKEND_IMAGE_CACHE} >/dev/null 2>&1",
                                returnStatus: true
                            ) == 0
                                ? "--cache-from type=registry,ref=${env.BACKEND_IMAGE_CACHE}"
                                : ""
                            def backendTagArgs = [
                                "--tag ${env.BACKEND_IMAGE_LATEST}",
                                "--tag ${env.BACKEND_SHA_TAG}"
                            ]

                            if (env.EXACT_GIT_TAG) {
                                backendTagArgs << "--tag ${env.BACKEND_IMAGE_REPO}:${env.EXACT_GIT_TAG}"
                            }

                            def backendBuildArgs = [
                                "--platform ${env.PLATFORMS}",
                                "--file backend/Dockerfile",
                                "--label org.opencontainers.image.created=${env.BUILD_TIMESTAMP}",
                                "--label org.opencontainers.image.revision=${env.GIT_COMMIT}",
                                "--label org.opencontainers.image.source=${env.REPO_HTTP_URL}",
                                "--label org.opencontainers.image.version=${env.EXACT_GIT_TAG ?: "sha-${env.SHORT_SHA}"}",
                                "--pull"
                            ] + backendTagArgs

                            if (backendCacheFromArg) {
                                backendBuildArgs << backendCacheFromArg
                            }

                            backendBuildArgs += [
                                "--cache-to type=registry,ref=${env.BACKEND_IMAGE_CACHE},mode=max",
                                "--push",
                                "--progress=plain",
                                "backend"
                            ]

                            sh """
                                docker buildx build \\
                                    ${backendBuildArgs.join(' \\\n                                    ')}
                            """
                        } finally {
                            sh 'docker logout $HARBOR_URL'
                        }
                    }
                }
            }
        }

        stage('Docker Build & Push Frontend') {
            when {
                expression { env.FRONTEND_BUILD_REQUIRED == 'true' }
            }
            options {
                timeout(time: 45, unit: 'MINUTES')
            }
            steps {
                script {
                    withCredentials([
                        usernamePassword(
                            credentialsId: env.HARBOR_CREDS_ID,
                            usernameVariable: 'HARBOR_USERNAME',
                            passwordVariable: 'HARBOR_PASSWORD'
                        )
                    ]) {
                        sh """
                            set -eu
                            echo "\$HARBOR_PASSWORD" | docker login ${env.HARBOR_URL} -u "\$HARBOR_USERNAME" --password-stdin
                        """

                        try {
                            def frontendCacheFromArg = sh(
                                script: "docker buildx imagetools inspect ${env.FRONTEND_IMAGE_CACHE} >/dev/null 2>&1",
                                returnStatus: true
                            ) == 0
                                ? "--cache-from type=registry,ref=${env.FRONTEND_IMAGE_CACHE}"
                                : ""
                            def frontendTagArgs = [
                                "--tag ${env.FRONTEND_IMAGE_LATEST}",
                                "--tag ${env.FRONTEND_SHA_TAG}"
                            ]

                            if (env.EXACT_GIT_TAG) {
                                frontendTagArgs << "--tag ${env.FRONTEND_IMAGE_REPO}:${env.EXACT_GIT_TAG}"
                            }

                            def frontendBuildArgs = [
                                "--platform ${env.PLATFORMS}",
                                "--file frontend/Dockerfile",
                                "--label org.opencontainers.image.created=${env.BUILD_TIMESTAMP}",
                                "--label org.opencontainers.image.revision=${env.GIT_COMMIT}",
                                "--label org.opencontainers.image.source=${env.REPO_HTTP_URL}",
                                "--label org.opencontainers.image.version=${env.EXACT_GIT_TAG ?: "sha-${env.SHORT_SHA}"}",
                                "--pull"
                            ] + frontendTagArgs

                            if (frontendCacheFromArg) {
                                frontendBuildArgs << frontendCacheFromArg
                            }

                            frontendBuildArgs += [
                                "--cache-to type=registry,ref=${env.FRONTEND_IMAGE_CACHE},mode=max",
                                "--push",
                                "--progress=plain",
                                "frontend"
                            ]

                            sh """
                                docker buildx build \\
                                    ${frontendBuildArgs.join(' \\\n                                    ')}
                            """
                        } finally {
                            sh 'docker logout $HARBOR_URL'
                        }
                    }
                }
            }
        }

        stage('Verify Images') {
            when {
                expression { env.DEPLOY_REQUIRED == 'true' }
            }
            steps {
                script {
                    withCredentials([
                        usernamePassword(
                            credentialsId: env.HARBOR_CREDS_ID,
                            usernameVariable: 'HARBOR_USERNAME',
                            passwordVariable: 'HARBOR_PASSWORD'
                        )
                    ]) {
                        sh '''
                            set -eu
                            echo "$HARBOR_PASSWORD" | docker login $HARBOR_URL -u "$HARBOR_USERNAME" --password-stdin
                        '''

                        try {
                            if (env.BACKEND_BUILD_REQUIRED == 'true') {
                                sh '''
                                    echo "Inspecting backend latest manifest"
                                    docker buildx imagetools inspect $BACKEND_IMAGE_LATEST

                                    echo "Inspecting backend sha manifest"
                                    docker buildx imagetools inspect $BACKEND_SHA_TAG
                                '''

                                if (env.EXACT_GIT_TAG) {
                                    sh '''
                                        echo "Inspecting backend git tag manifest"
                                        docker buildx imagetools inspect $BACKEND_IMAGE_REPO:$EXACT_GIT_TAG
                                    '''
                                }
                            }

                            if (env.FRONTEND_BUILD_REQUIRED == 'true') {
                                sh '''
                                    echo "Inspecting frontend latest manifest"
                                    docker buildx imagetools inspect $FRONTEND_IMAGE_LATEST

                                    echo "Inspecting frontend sha manifest"
                                    docker buildx imagetools inspect $FRONTEND_SHA_TAG
                                '''

                                if (env.EXACT_GIT_TAG) {
                                    sh '''
                                        echo "Inspecting frontend git tag manifest"
                                        docker buildx imagetools inspect $FRONTEND_IMAGE_REPO:$EXACT_GIT_TAG
                                    '''
                                }
                            }
                        } finally {
                            sh 'docker logout $HARBOR_URL'
                        }
                    }
                }
            }
        }

        stage('Trigger Watchtower') {
            when {
                expression { env.DEPLOY_REQUIRED == 'true' }
            }
            steps {
                sh '''
                    set -eu

                    response=$(curl -sS -w "\\n%{http_code}" \
                        -H "Authorization: Bearer $WATCHTOWER_TOKEN" \
                        "$WATCHTOWER_URL/v1/update")

                    http_code=$(echo "$response" | tail -n1)
                    body=$(echo "$response" | sed '$d')

                    if [ "$http_code" -eq 200 ]; then
                        echo "Watchtower update triggered successfully"
                        echo "Response: $body"
                    else
                        echo "Failed to trigger Watchtower update"
                        echo "HTTP Code: $http_code"
                        echo "Response: $body"
                        exit 1
                    fi
                '''
            }
        }

        stage('Verify Deployment') {
            when {
                expression { env.DEPLOY_REQUIRED == 'true' }
            }
            steps {
                sh '''
                    deadline=$(( $(date +%s) + $DEPLOY_TIMEOUT_SECONDS ))

                    while [ "$(date +%s)" -lt "$deadline" ]; do
                        body=$(curl -fsS "$APP_HEALTH_URL" || true)

                        if [ -n "$body" ]; then
                            echo "Health response: $body"

                            if echo "$body" | grep -Eq '"status"[[:space:]]*:[[:space:]]*"ok"' \
                                && echo "$body" | grep -q "$APP_HEALTH_EXPECTED_SERVICE"; then
                                echo "Deployment verified at $APP_HEALTH_URL"
                                exit 0
                            fi
                        fi

                        sleep 5
                    done

                    echo "Deployment verification timed out after ${DEPLOY_TIMEOUT_SECONDS}s"
                    exit 1
                '''
            }
        }
    }

    post {
        success {
            script {
                def successMessage = env.DEPLOY_REQUIRED == 'true'
                    ? ":tada: 빌드 성공! 배포가 완료되었습니다.\n프로젝트: ${env.JOB_NAME} #${env.BUILD_NUMBER}\n바로가기: ${env.BUILD_URL}"
                    : ":white_check_mark: 빌드와 품질 검증이 성공했습니다. 배포 대상 변경이 없어 이미지 푸시와 배포는 생략되었습니다.\n프로젝트: ${env.JOB_NAME} #${env.BUILD_NUMBER}\n바로가기: ${env.BUILD_URL}"

                mattermostSend(
                    color: 'good',
                    message: successMessage
                )
            }
        }

        failure {
            mattermostSend(
                color: 'danger',
                message: ":rotating_light: 빌드 실패... 로그를 확인해주세요.\n프로젝트: ${env.JOB_NAME} #${env.BUILD_NUMBER}\n바로가기: ${env.BUILD_URL}"
            )
        }

        always {
            script {
                echo "빌드 완료. Buildx는 이미지를 직접 푸시하므로 로컬 정리가 불필요합니다."
            }
        }
    }
}
