// Declarative pipeline: test -> build -> scan -> push -> deploy staging -> approval -> deploy production.
// Jenkins prerequisites are listed in docs/jenkins-setup.md.
pipeline {
  agent any

  options {
    timestamps()
    disableConcurrentBuilds()
    buildDiscarder(logRotator(numToKeepStr: '20'))
    timeout(time: 30, unit: 'MINUTES')
  }

  parameters {
    booleanParam(name: 'DEPLOY', defaultValue: true, description: 'Run the deploy stages on main')
  }

  environment {
    REGISTRY        = 'docker.io'
    IMAGE_REPO      = 'shubhamkhedkar/orders-api'
    REGISTRY_CREDS  = 'dockerhub-creds'      // Jenkins "Username with password" credential
    KUBE_STAGING    = 'kubeconfig-staging'   // Jenkins "Secret file" credential
    KUBE_PRODUCTION = 'kubeconfig-production'
  }

  stages {
    stage('Checkout') {
      steps {
        checkout scm
        script {
          env.GIT_SHORT = sh(script: 'git rev-parse --short=7 HEAD', returnStdout: true).trim()
          env.IMAGE     = "${env.REGISTRY}/${env.IMAGE_REPO}:sha-${env.GIT_SHORT}"
        }
      }
    }

    stage('Install, lint and test') {
      agent {
        docker {
          image 'node:20-alpine'
          reuseNode true
        }
      }
      steps {
        sh 'npm ci'
        sh 'npm run lint'
        sh 'mkdir -p test-results'
        sh 'node --test --test-reporter=spec --test-reporter=junit --test-reporter-destination=stdout --test-reporter-destination=test-results/junit.xml "tests/**/*.test.js"'
      }
      post {
        always {
          junit allowEmptyResults: true, testResults: 'test-results/junit.xml'
        }
      }
    }

    stage('Lint Dockerfile and scripts') {
      parallel {
        stage('hadolint') {
          steps {
            sh 'docker run --rm -i hadolint/hadolint < Dockerfile'
          }
        }
        stage('shellcheck') {
          steps {
            sh 'docker run --rm -v "$PWD:/mnt" -w /mnt koalaman/shellcheck:stable scripts/deploy.sh scripts/smoke-test.sh'
          }
        }
      }
    }

    stage('Build image') {
      steps {
        sh "docker build --build-arg APP_VERSION=${env.GIT_COMMIT} -t ${env.IMAGE} ."
      }
    }

    stage('Scan image') {
      steps {
        sh """
          docker run --rm -v /var/run/docker.sock:/var/run/docker.sock aquasec/trivy:latest \
            image --severity CRITICAL,HIGH --ignore-unfixed --exit-code 1 ${env.IMAGE}
        """
      }
    }

    stage('Push image') {
      when { branch 'main' }
      steps {
        withCredentials([usernamePassword(credentialsId: env.REGISTRY_CREDS,
                                          usernameVariable: 'REG_USER',
                                          passwordVariable: 'REG_PASS')]) {
          sh '''
            echo "$REG_PASS" | docker login "$REGISTRY" -u "$REG_USER" --password-stdin
            docker push "$IMAGE"
            docker tag "$IMAGE" "$REGISTRY/$IMAGE_REPO:latest"
            docker push "$REGISTRY/$IMAGE_REPO:latest"
          '''
        }
      }
    }

    stage('Deploy to staging') {
      when { allOf { branch 'main'; expression { params.DEPLOY } } }
      steps {
        withCredentials([file(credentialsId: env.KUBE_STAGING, variable: 'KUBECONFIG')]) {
          sh 'scripts/deploy.sh "$IMAGE" orders-staging'
        }
      }
    }

    stage('Approve production') {
      when { allOf { branch 'main'; expression { params.DEPLOY } } }
      steps {
        timeout(time: 1, unit: 'HOURS') {
          input message: "Deploy ${env.IMAGE} to production?", ok: 'Deploy'
        }
      }
    }

    stage('Deploy to production') {
      when { allOf { branch 'main'; expression { params.DEPLOY } } }
      steps {
        withCredentials([file(credentialsId: env.KUBE_PRODUCTION, variable: 'KUBECONFIG')]) {
          sh 'scripts/deploy.sh "$IMAGE" orders'
        }
      }
    }
  }

  post {
    always {
      sh 'docker logout "$REGISTRY" || true'
      cleanWs()
    }
    success { echo "Pipeline succeeded for ${env.IMAGE}" }
    failure { echo 'Pipeline failed. Check the stage logs above.' }
  }
}
