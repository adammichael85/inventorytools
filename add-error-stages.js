const fs = require('fs');
let c = fs.readFileSync('app/dashboard/page.tsx', 'utf8');

// Find the startConvert function and add stage tracking
c = c.replace(
  `    setConvertState('processing')
    setConvertError('')
    setElapsed(0)
    setProcessingRooms([{ name: 'Reading PDF...', state: 'active' }])`,
  `    setConvertState('processing')
    setConvertError('')
    setElapsed(0)
    setProcessingRooms([{ name: 'Reading PDF...', state: 'active' }])
    let currentStage = 'Reading PDF'`
);

// Add stage updates before key operations
c = c.replace(
  `      const base64 = await fileToBase64(selectedFile)`,
  `      currentStage = 'Reading PDF'
      const base64 = await fileToBase64(selectedFile)`
);

c = c.replace(
  `      const data = await convertPDF(base64, 'application/pdf')`,
  `      currentStage = 'Calling AI API'
      const data = await convertPDF(base64, 'application/pdf')`
);

c = c.replace(
  `      if (!(window as any).docx) {`,
  `      currentStage = 'Loading Word document library'
      if (!(window as any).docx) {`
);

c = c.replace(
  `      const doc = new Document({`,
  `      currentStage = 'Building Word document'
      const doc = new Document({`
);

// Update the catch block to show the stage
c = c.replace(
  `} catch (err: any) {
      clearInterval(timer)
      const msg = err.message || err.toString() || 'Unknown error'
      setConvertError(msg)
      setConvertState('error')
    }`,
  `} catch (err: any) {
      clearInterval(timer)
      const msg = err.message || err.toString() || 'Unknown error'
      setConvertError('Failed at: ' + currentStage + '\\n\\nError: ' + msg)
      setConvertState('error')
    }`
);

if (c.includes('currentStage')) {
  console.log('Added stage tracking');
} else {
  console.log('ERROR: pattern not found');
}

fs.writeFileSync('app/dashboard/page.tsx', c);
console.log('done');
