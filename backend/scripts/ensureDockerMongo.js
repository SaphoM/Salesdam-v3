import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const backendDirectory = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
);

function shouldStartDockerMongo() {
  if (process.env.NODE_ENV === 'production') return false;
  if (process.env.SKIP_DOCKER_DB === 'true') return false;

  const mongoUri = process.env.MONGO_URI || '';
  return mongoUri.includes('localhost') || mongoUri.includes('127.0.0.1');
}

function runDockerCompose() {
  return new Promise((resolve, reject) => {
    const docker = spawn(
      'docker',
      ['compose', 'up', '-d', '--wait', 'mongodb'],
      {
        cwd: backendDirectory,
        stdio: 'inherit',
      },
    );

    docker.once('error', (error) => {
      reject(
        new Error(
          `Could not start MongoDB with Docker. Is Docker Desktop running? ${error.message}`,
        ),
      );
    });

    docker.once('exit', (code) => {
      if (code === 0) {
        resolve();
        return;
      }

      reject(
        new Error(`Docker Compose failed to start MongoDB (exit code ${code}).`),
      );
    });
  });
}

export default async function ensureDockerMongo() {
  if (!shouldStartDockerMongo()) return;

  console.log('Ensuring the MongoDB Docker container is running...');
  await runDockerCompose();
}
