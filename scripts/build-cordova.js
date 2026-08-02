const fs = require('fs');
const path = require('path');

const indexPath = path.resolve(process.cwd(), 'www/index.html');

if (fs.existsSync(indexPath)) {
  let content = fs.readFileSync(indexPath, 'utf8');

  // Injeta a tag cordova.js se ainda não existir no index.html final do build
  if (!content.includes('cordova.js')) {
    content = content.replace(
      '</head>',
      '  <script src="cordova.js"></script>\n</head>'
    );
    fs.writeFileSync(indexPath, content, 'utf8');
    console.log('✅ [build-cordova] Tag <script src="cordova.js"></script> injetada em www/index.html');
  } else {
    console.log('ℹ️ [build-cordova] cordova.js já está presente em www/index.html');
  }
} else {
  console.error('❌ [build-cordova] Erro: www/index.html não encontrado. Certifique-se de rodar o vite build primeiro.');
  process.exit(1);
}
