# Requires: Git for Windows
# TURNEX v2.0 - Windows PowerShell setup script

Write-Host "Setting up TURNEX v2.0 - Commercial Version" -ForegroundColor Cyan
Write-Host "================================================" -ForegroundColor Cyan

# 1) Create project structure
Write-Host "Creating project structure..."
New-Item -ItemType Directory -Force -Path "turnex-v2" | Out-Null
New-Item -ItemType Directory -Force -Path "turnex-v2/assets/images" | Out-Null
New-Item -ItemType Directory -Force -Path "turnex-v2/assets/icons" | Out-Null
New-Item -ItemType Directory -Force -Path "turnex-v2/css" | Out-Null
New-Item -ItemType Directory -Force -Path "turnex-v2/js" | Out-Null
New-Item -ItemType Directory -Force -Path "turnex-v2/docs" | Out-Null

Set-Location "turnex-v2"

# 2) Create essential files
Write-Host "Creating essential files..."
New-Item -ItemType File -Force -Path "index.html" | Out-Null
New-Item -ItemType File -Force -Path "css/styles.css" | Out-Null
New-Item -ItemType File -Force -Path "js/script.js" | Out-Null
New-Item -ItemType File -Force -Path "README.md" | Out-Null
New-Item -ItemType File -Force -Path ".gitignore" | Out-Null
New-Item -ItemType File -Force -Path "package.json" | Out-Null

# 3) Generate .gitignore
@'
# Dependencies
node_modules/
npm-debug.log*

# OS generated files
.DS_Store
.DS_Store?
._*
.Spotlight-V100
.Trashes
ehthumbs.db
Thumbs.db

# IDE files
.vscode/
.idea/
*.swp
*.swo

# Build files
dist/
build/

# Environment variables
.env
.env.local
.env.production
.env.staging

# Cache
.cache/
.parcel-cache/

# Logs
logs
*.log
'@ | Set-Content -Path ".gitignore" -Encoding UTF8

# 4) Initialize Git
Write-Host "Initializing Git..."
& git init | Out-Null
& git branch -M main | Out-Null

# 5) Create initial README
@'
# TURNEX v2.0 - Plataforma Comercial
## Estilo Booksy/Fresha

[![Live Demo](https://img.shields.io/badge/Demo-Live-success?style=for-the-badge)](https://euge-90.github.io/turnex-v2/)
[![Version](https://img.shields.io/badge/Version-2.0.0-blue?style=for-the-badge)]()

## Demo en Vivo
**https://euge-90.github.io/turnex-v2/**

## Diferencias con v1.0
- OK Diseño comercial profesional (estilo Booksy/Fresha)
- OK Search bar funcional
- OK Service categories
- OK Trust indicators
- OK Stats comerciales realistas
- OK Mobile-first UX optimizada

## Información Académica
- **Universidad**: UADE
- **Materia**: Testing de Aplicaciones
- **Grupo**: 11
- **Versión**: 2.0 (Comercial)

---
**TURNEX v2.0** - Desarrollado por Grupo 11 UADE
'@ | Set-Content -Path "README.md" -Encoding UTF8

# 6) Basic HTML
@'
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>TURNEX v2.0 - Reserva servicios de belleza</title>
    <meta name="description" content="Plataforma comercial para reservar servicios de belleza. Estilo Booksy/Fresha profesional.">

    <!-- Bootstrap 5.3 -->
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/css/bootstrap.min.css" rel="stylesheet">
    <!-- Custom Styles -->
    <link rel="stylesheet" href="css/styles.css">
</head>
<body>
    <!-- Navigation -->
    <nav class="navbar navbar-expand-lg navbar-light bg-white shadow-sm">
        <div class="container">
            <a class="navbar-brand fw-bold text-primary" href="#">TURNEX v2.0</a>
            <span class="badge bg-success">Commercial Version</span>
        </div>
    </nav>

    <!-- Hero Section -->
    <section class="hero-commercial py-5">
        <div class="container text-center">
            <h1 class="display-4 fw-bold mb-4">
                Reserva servicios de belleza en tu zona
            </h1>
            <p class="lead mb-4">
                Plataforma comercial profesional - Estilo Booksy/Fresha
            </p>
            <div class="alert alert-info">
                <strong>En Desarrollo:</strong> Versión comercial basada en las mejores prácticas de Booksy y Fresha
            </div>
        </div>
    </section>

    <!-- Version Comparison -->
    <section class="py-5 bg-light">
        <div class="container">
            <div class="row text-center">
                <div class="col-md-6">
                    <div class="card h-100">
                        <div class="card-body">
                            <h5 class="card-title">TURNEX v1.0 (Básica)</h5>
                            <p class="card-text">Versión académica inicial</p>
                            <a href="https://euge-90.github.io/turnex/" class="btn btn-outline-secondary" target="_blank">Ver v1.0</a>
                        </div>
                    </div>
                </div>
                <div class="col-md-6">
                    <div class="card h-100 border-primary">
                        <div class="card-body">
                            <h5 class="card-title text-primary">TURNEX v2.0 (Comercial)</h5>
                            <p class="card-text">Estilo Booksy/Fresha profesional</p>
                            <span class="badge bg-primary">Estás aquí</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </section>

    <!-- Bootstrap JS -->
    <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/js/bootstrap.bundle.min.js"></script>
    <script src="js/script.js"></script>
</body>
</html>
'@ | Set-Content -Path "index.html" -Encoding UTF8

# 7) Basic CSS
@'
/* TURNEX v2.0 - Commercial Styles */
:root {
    --primary: #6366F1;
    --secondary: #EC4899;
    --success: #10B981;
    --background: #FAFAFA;
    --text: #374151;
}

body {
    font-family: 'Inter', system-ui, sans-serif;
    color: var(--text);
    background-color: var(--background);
}

.hero-commercial {
    background: linear-gradient(135deg, #ffffff 0%, #f8fafc 100%);
    min-height: 60vh;
    display: flex;
    align-items: center;
}

.navbar-brand {
    font-size: 1.5rem;
}

.card {
    transition: transform 0.3s ease;
}

.card:hover {
    transform: translateY(-5px);
}
'@ | Set-Content -Path "css/styles.css" -Encoding UTF8

# 8) Basic JS
@'
// TURNEX v2.0 - Commercial JavaScript
console.log('TURNEX v2.0 - Commercial Version Loaded');

document.addEventListener('DOMContentLoaded', function() {
    console.log('TURNEX v2.0 ready for commercial implementation');
});
'@ | Set-Content -Path "js/script.js" -Encoding UTF8

# 9) First commit
Write-Host "Making initial commit..."
& git add .
& git commit -m @'
feat: TURNEX v2.0 initial setup - Commercial version

Setup complete:
- Professional project structure
- Basic HTML/CSS/JS foundation
- Version differentiation from v1.0
- Ready for Booksy/Fresha style implementation
- GitHub Pages deployment ready

Academic project: UADE Grupo 11
Next: Implement commercial features
'@

Write-Host ""; Write-Host "TURNEX v2.0 setup complete!" -ForegroundColor Green
Write-Host "📁 Project created in: $(Get-Location)"
Write-Host "🔧 Next steps:"
Write-Host "   1. cd turnex-v2"
Write-Host "   2. Create GitHub repo: gh repo create turnex-v2 --public --source=. --remote=origin --push"
Write-Host "   3. (alternativa) git remote add origin https://github.com/<tu-usuario>/turnex-v2.git; git push -u origin main"
Write-Host "   4. Enable GitHub Pages in repo settings"
Write-Host ""
Write-Host "🌐 Will be live at: https://euge-90.github.io/turnex-v2/"
