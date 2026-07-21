pipeline {
    agent any

    tools {
        nodejs 'node-20'
    }

    stages {
        stage('Install dependencies') {
            steps {
                sh 'npm ci'
            }
        }

        stage('Build') {
            steps {
                sh 'npm run build'
            }
        }

        // Pausado até resolver capacidade de RAM da VPS (Jenkins/Sonar/scanner
        // disputando memória com n8n/evolution-api derrubavam o build por OOM
        // real do kernel - ver docs/superpowers/specs/2026-07-21-jenkins-sonarqube-design.md).
        // Descomentar quando a VPS tiver RAM suficiente.
        // stage('SonarQube Analysis') {
        //     steps {
        //         withSonarQubeEnv('SonarQube') {
        //             sh 'npx --yes @sonar/scan'
        //         }
        //     }
        // }

        // stage('Quality Gate') {
        //     steps {
        //         timeout(time: 5, unit: 'MINUTES') {
        //             waitForQualityGate abortPipeline: true
        //         }
        //     }
        // }
    }
}