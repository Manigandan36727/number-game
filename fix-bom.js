const fs = require('fs');
const path = require('path');

const files = [
  'client/src/App.js',
  'client/src/index.js',
  'client/src/components/WaitingRoom.js',
  'client/src/components/GameRoom.js',
  'client/src/components/GameBoard.js'
];

files.forEach(file => {
  try {
    const filePath = path.join(process.cwd(), file);
    let content = fs.readFileSync(filePath, 'utf8');
    // Remove BOM if present
    if (content.charCodeAt(0) === 0xFEFF) {
      content = content.slice(1);
      fs.writeFileSync(filePath, content, 'utf8');
      console.log(✅ Fixed BOM in: );
    } else {
      console.log(✓ No BOM in: );
    }
  } catch (err) {
    console.log(❌ Error with : );
  }
});
