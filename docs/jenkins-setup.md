# Jenkins setup

The `Jenkinsfile` at the repo root is a declarative pipeline. These are the pieces it expects.

## 1. Start a local controller (optional)

```bash
cd jenkins
export DOCKER_GID="$(getent group docker | cut -d: -f3)"
docker compose up -d --build
docker exec jenkins cat /var/jenkins_home/secrets/initialAdminPassword
```

Open http://localhost:8080, paste the password, and create an admin user. The plugins in `jenkins/plugins.txt` are already installed.

## 2. Credentials

Add these under **Manage Jenkins → Credentials → System → Global credentials**:

| ID | Type | Contents |
|----|------|----------|
| `dockerhub-creds` | Username with password | Docker Hub username and an access token |
| `kubeconfig-staging` | Secret file | kubeconfig for the staging cluster |
| `kubeconfig-production` | Secret file | kubeconfig for the production cluster |

To push somewhere other than Docker Hub, change `REGISTRY` and `IMAGE_REPO` in the `environment` block.

## 3. Create the job

1. **New Item → Multibranch Pipeline**, name it `orders-api`.
2. Branch source: GitHub, repository `https://github.com/shubhamkhedkar/cicd-pipeline-github-actions-jenkins`.
3. Build configuration: by Jenkinsfile, script path `Jenkinsfile`.
4. Save. Jenkins scans branches and starts a build per branch.

Pull-request and feature branches run lint, test, build and scan only. The push and deploy stages run on `main`, and production waits at the **Approve production** input step.

## 4. GitHub webhook (optional)

In the GitHub repo, go to **Settings → Webhooks → Add webhook**, use `https://<your-jenkins>/github-webhook/`, content type `application/json`, and the "Just the push event" option.
