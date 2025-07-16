function addRow() {
  const table = document.getElementById('partsTable')
  const row = table.insertRow()
  const index = table.rows.length - 1
  row.innerHTML = `
        <td>${index}</td>
        <td><input type="number" value="0" onfocus="if(this.value=='0') this.value=''" onblur="if(this.value=='') this.value='0'"></td>
        <td><input type="number" value="0" onfocus="if(this.value=='0') this.value=''" onblur="if(this.value=='') this.value='0'"></td>
        <td><input type="number" value="1" onfocus="if(this.value=='1') this.value=''" if(this.value=='') this.value='1'"></td>
        <td><input type="checkbox" class="rotation-checkbox"></td>
        <td><input type="checkbox" class="edge-checkbox"></td>
        <td><input type="checkbox" class="edge-checkbox"></td>
        <td><input type="checkbox" class="edge-checkbox"></td>
        <td><input type="checkbox" class="edge-checkbox"></td>
        <td><span class="delete-button" onclick="deleteRow(this)"><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" 
     viewBox="0 0 24 24" fill="none" stroke="currentColor" 
     stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
  <polyline points="3 6 5 6 21 6"></polyline>
  <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"></path>
  <path d="M10 11v6"></path>
  <path d="M14 11v6"></path>
  <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"></path>
</svg>
</span></td>
      `
}

function deleteRow(el) {
  const row = el.closest('tr')
  row.remove()
}

function calculateLayout() {
  const sheetWidth = parseFloat(document.getElementById('sheetWidth').value)
  const sheetHeight = parseFloat(document.getElementById('sheetHeight').value)
  const kerf = parseFloat(document.getElementById('kerf').value)
  const margin = parseFloat(document.getElementById('margin').value)
  const sheetCost = parseFloat(document.getElementById('sheetCost').value)
  const edgeCost = parseFloat(document.getElementById('edgeCost').value)
  const cutCost = parseFloat(document.getElementById('cutCost').value)
  const prepSheetCost = parseFloat(document.getElementById('prepSheetCost').value)
  const prepEdgeCost = parseFloat(document.getElementById('prepEdgeCost').value)
  const extraCost = parseFloat(document.getElementById('extraCost').value)
  const minWidth = parseFloat(document.getElementById('minWidth').value)
  const minHeight = parseFloat(document.getElementById('minHeight').value)

  const table = document.getElementById('partsTable')
  let parts = []
  let edgeLength = 0
  let cutCount = 0

  for (let i = 1; i < table.rows.length; i++) {
    const row = table.rows[i]
    const w = parseFloat(row.cells[1].firstChild.value)
    const h = parseFloat(row.cells[2].firstChild.value)
    const qty = parseInt(row.cells[3].firstChild.value)
    const vertical = row.cells[4].firstChild.checked
    const edgeW1 = row.cells[5].firstChild.checked
    const edgeW2 = row.cells[6].firstChild.checked
    const edgeH1 = row.cells[7].firstChild.checked
    const edgeH2 = row.cells[8].firstChild.checked

    if (w < minWidth || h < minHeight) {
      alert(`❌ Part #${i} is smaller than minimum dimensions!`)
      return
    }

    const pw = vertical ? h : w
    const ph = vertical ? w : h

    const maxW = sheetWidth - 2 * margin
    const maxH = sheetHeight - 2 * margin

    if (pw > maxW || ph > maxH) {
      alert(
        `❌ Part #${i} (${pw}×${ph}) does not fit on the sheet (max. ${maxW}×${maxH} мм) taking into account the indentation!`,
      )
      return
    }

    for (let q = 0; q < qty; q++) {
      parts.push({ w, h, vertical, edgeW1, edgeW2, edgeH1, edgeH2 })
      cutCount += 2

      let edge = 0
      if (edgeW1) edge += w
      if (edgeW2) edge += w
      if (edgeH1) edge += h
      if (edgeH2) edge += h
      edgeLength += edge / 1000
    }
  }

  parts.sort((a, b) => Math.max(b.w, b.h) - Math.max(a.w, a.h))

  const container = document.getElementById('canvasContainer')
  container.innerHTML = ''
  const costSummary = document.getElementById('costSummary')
  costSummary.innerHTML = ''

  let scale = 0.3
  let sheetCount = 0

  function newCanvas() {
    const canvasWrapper = document.createElement('div')
    const label = document.createElement('div')
    label.textContent = `Sheet  #${sheetCount + 1}`
    label.style.margin = '10px 0 4px 0'
    label.style.fontWeight = 'bold'
    canvasWrapper.appendChild(label)

    const canvas = document.createElement('canvas')
    canvas.width = sheetWidth * scale + 2
    canvas.height = sheetHeight * scale + 2
    canvas.style.marginBottom = '20px'
    canvasWrapper.appendChild(canvas)
    container.appendChild(canvasWrapper)

    const ctx = canvas.getContext('2d')
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    ctx.strokeStyle = 'black'
    ctx.strokeRect(0, 0, sheetWidth * scale, sheetHeight * scale)
    return { canvas, ctx, used: [] }
  }

  let sheets = [newCanvas()]
  sheetCount++

  parts.forEach(part => {
    let pw = part.vertical ? part.h : part.w
    let ph = part.vertical ? part.w : part.h
    let placed = false

    for (let s = 0; s < sheets.length; s++) {
      let sheet = sheets[s]
      for (let y = margin; y <= sheetHeight - ph - margin; y += 1) {
        for (let x = margin; x <= sheetWidth - pw - margin; x += 1) {
          let overlaps = sheet.used.some(
            p => x < p.x + p.w + kerf && x + pw + kerf > p.x && y < p.y + p.h + kerf && y + ph + kerf > p.y,
          )
          if (!overlaps) {
            drawPart(sheet.ctx, x, y, pw, ph, scale)
            sheet.used.push({ x, y, w: pw, h: ph })
            placed = true
            return
          }
        }
      }
    }

    if (!placed) {
      let newSheet = newCanvas()
      sheetCount++
      sheets.push(newSheet)
      drawPart(newSheet.ctx, margin, margin, pw, ph, scale)
      newSheet.used.push({ x: margin, y: margin, w: pw, h: ph })
    }
  })

  const totalSheetCost = sheetCount * sheetCost
  const totalEdgeCost = edgeLength * edgeCost
  const totalCutCost = cutCount * cutCost
  const totalPrepSheetCost = sheetCount * prepSheetCost
  const totalPrepEdgeCost = sheetCount * prepEdgeCost

  const totalCost = totalSheetCost + totalEdgeCost + totalCutCost + totalPrepSheetCost + totalPrepEdgeCost + extraCost

  costSummary.innerHTML = `
    <h3>Cost:</h3>
    <p>Sheets: ${sheetCount}, Cost of sheets: ${totalSheetCost.toFixed(2)} €</p>
    <p>Edge length: ${edgeLength.toFixed(2)} м, Edge cost: ${totalEdgeCost.toFixed(2)} €</p>
    <p>Number of cuts: ${cutCount}, Cost of cuts: ${totalCutCost.toFixed(2)} €</p>
    <p>Handling Charge per 1 sheet: ${sheetCount}, Cost: ${totalPrepSheetCost.toFixed(2)} €</p>
    <p>Setup charge Edgebander for sheet: ${sheetCount}, Cost: ${totalPrepEdgeCost.toFixed(2)} €</p>
    <p>Other expenses: ${extraCost.toFixed(2)} €</p>
    <h3>Total cost: ${totalCost.toFixed(2)} €</h3>
  `
  // Show the "Save as PDF" button
  document.getElementById('exportPdfBtn').style.display = 'inline-block'
}

function drawPart(ctx, x, y, pw, ph, scale) {
  ctx.fillStyle = getRandomColor()
  ctx.fillRect(x * scale, y * scale, pw * scale, ph * scale)
  ctx.strokeStyle = 'black'
  ctx.strokeRect(x * scale, y * scale, pw * scale, ph * scale)

  // Centered text without padding
  ctx.fillStyle = 'black'
  ctx.font = '12px sans-serif'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(`${pw}x${ph}`, (x + pw / 2) * scale, (y + ph / 2) * scale)
}

function getRandomColor() {
  const letters = '789ABCD'
  let color = '#'
  for (let i = 0; i < 6; i++) {
    color += letters[Math.floor(Math.random() * letters.length)]
  }
  return color
}

const textarea = document.getElementById('textAreaInput')

textarea.addEventListener('input', function () {
  this.style.height = 'auto' // Reset current altitude
  this.style.height = this.scrollHeight + 'px' // Setting a new height
})
