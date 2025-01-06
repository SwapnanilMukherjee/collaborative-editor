import { useState, useEffect } from "react";
import * as Y from "yjs";
import { WebrtcProvider } from "y-webrtc";
import { QuillBinding } from "y-quill";
import Quill from "quill";
import { saveAs } from "file-saver";
import { Document, Packer, Paragraph, TextRun } from "docx";
import { jsPDF } from "jspdf";
import { Download } from 'lucide-react';
import "quill/dist/quill.snow.css";
import "./Editor.css";

function App() {
  const [editor, setEditor] = useState(null);
  const [doc, setDoc] = useState(new Y.Doc());

  useEffect(() => {
    const quill = new Quill("#editor-container", {
      modules: {
        toolbar: {
          container: [
            [{ 'font': [] }],
            [{ 'size': ['small', false, 'large', 'huge'] }],
            ['bold', 'italic', 'underline'],
            [{ 'list': 'ordered'}, { 'list': 'bullet' }],
            ['clean']
          ]
        }
      },
      theme: "snow",
      placeholder: 'Start typing here...',
    });

    const provider = new WebrtcProvider("quill-room", doc);
    const type = doc.getText("quill");
    new QuillBinding(type, quill, provider.awareness);
    setEditor(quill);

    return () => {
      provider.destroy();
      doc.destroy();
    };
  }, [doc]);
  
  function getFormattedContent() {
    const content = editor.getContents();
    let currentParagraph = [];
    const paragraphs = [];

    content.ops.forEach((op) => {
      const text = op.insert;
      const attributes = op.attributes || {};

      // Split text by newlines to handle paragraphs
      const lines = text.split('\n');
      
      lines.forEach((line, index) => {
        if (line.length > 0) {
          currentParagraph.push(
            new TextRun({
              text: line,
              bold: attributes.bold || false,
              italics: attributes.italic || false,
              underline: attributes.underline ? {} : undefined,
            })
          );
        }

        // Create new paragraph on newline
        if (index < lines.length - 1 || text.endsWith('\n')) {
          if (currentParagraph.length > 0) {
            paragraphs.push(new Paragraph({ 
              children: currentParagraph,
              bullet: attributes.list === 'bullet' ? { level: 0 } : undefined
            }));
            currentParagraph = [];
          }
        }
      });
    });

    // Add any remaining content as a paragraph
    if (currentParagraph.length > 0) {
      paragraphs.push(new Paragraph({ children: currentParagraph }));
    }

    return paragraphs;
  }

  async function downloadAsDocx() {
    if (!editor) return;

    const content = getFormattedContent();
    const document = new Document({
      sections: [{
        properties: {},
        children: content
      }]
    });

    try {
      const blob = await Packer.toBlob(document);
      saveAs(blob, "document.docx");
    } catch (error) {
      console.error("Error generating DOCX:", error);
    }
  }

  function downloadAsPDF() {
    if (!editor) return;

    const pdfDoc = new jsPDF({
      unit: 'pt',
      format: 'letter'
    });
    
    const content = editor.getContents();
    let y = 50; // Starting y position
    const margin = 50; // Margins in points
    const lineHeight = 16;
    const pageHeight = pdfDoc.internal.pageSize.height;
    const pageWidth = pdfDoc.internal.pageSize.width;
    const maxWidth = pageWidth - (2 * margin);
    
    // Function to handle page breaks
    const checkNewPage = (currentY, height = lineHeight) => {
      if (currentY + height > pageHeight - margin) {
        pdfDoc.addPage();
        return margin;
      }
      return currentY;
    };

    // Function to apply text styling
    const applyTextStyle = (attributes = {}) => {
      // Handle font family
      let fontFamily = 'helvetica';
      if (attributes.font) {
        switch(attributes.font.toLowerCase()) {
          case 'arial':
            fontFamily = 'helvetica';
            break;
          case 'times new roman':
          case 'times':
            fontFamily = 'times';
            break;
          case 'courier new':
          case 'courier':
            fontFamily = 'courier';
            break;
        }
      }

      // Handle font style
      let fontStyle = 'normal';
      if (attributes.bold && attributes.italic) fontStyle = 'bolditalic';
      else if (attributes.bold) fontStyle = 'bold';
      else if (attributes.italic) fontStyle = 'italic';

      pdfDoc.setFont(fontFamily, fontStyle);

      // Handle font size
      let fontSize = 12; // default size
      if (attributes.size) {
        switch(attributes.size) {
          case 'small':
            fontSize = 10;
            break;
          case 'large':
            fontSize = 16;
            break;
          case 'huge':
            fontSize = 20;
            break;
        }
      }
      pdfDoc.setFontSize(fontSize);

      return fontSize; // Return for underline calculations
    };

    // Function to add underline
    const addUnderline = (text, x, y, fontSize) => {
      if (!text || text.length === 0) return;
      const textWidth = pdfDoc.getTextWidth(text);
      pdfDoc.setLineWidth(fontSize / 20);
      pdfDoc.line(x, y + 2, x + textWidth, y + 2);
    };

    let listLevel = 0;
    let orderedListCounter = 1;

    content.ops.forEach(op => {
      if (typeof op.insert !== 'string') return;

      const text = op.insert;
      const attributes = op.attributes || {};
      const fontSize = applyTextStyle(attributes);
      
      // Split text into lines
      const lines = text.split('\n');
      lines.forEach((line, index) => {
        // Handle empty lines or line breaks
        if (line.length === 0 && (index < lines.length - 1 || text.endsWith('\n'))) {
          y += lineHeight;
          y = checkNewPage(y);
          return;
        }

        if (line.length > 0) {
          let xPos = margin;
          let prefix = '';

          // Handle lists
          if (attributes.list) {
            xPos += 30; // Indent for list items
            if (attributes.list === 'bullet') {
              prefix = '• ';
            } else if (attributes.list === 'ordered') {
              prefix = `${orderedListCounter++}. `;
            }
          }

          // Word wrapping
          const words = (prefix + line).split(' ');
          let currentLine = '';

          words.forEach(word => {
            const testLine = currentLine + (currentLine ? ' ' : '') + word;
            const testWidth = pdfDoc.getTextWidth(testLine);

            if (testWidth > maxWidth - (xPos - margin)) {
              // Write current line
              pdfDoc.text(currentLine, xPos, y);
              if (attributes.underline) {
                addUnderline(currentLine, xPos, y, fontSize);
              }
              currentLine = word;
              y += lineHeight;
              y = checkNewPage(y);
            } else {
              currentLine = testLine;
            }
          });

          // Write remaining text
          if (currentLine.length > 0) {
            pdfDoc.text(currentLine, xPos, y);
            if (attributes.underline) {
              addUnderline(currentLine, xPos, y, fontSize);
            }
          }
        }

        // Handle line breaks
        if (index < lines.length - 1 || text.endsWith('\n')) {
          y += lineHeight;
          y = checkNewPage(y);
          
          // Reset ordered list counter when list ends
          if (!text.endsWith('\n')) {
            orderedListCounter = 1;
          }
        }
      });
    });

    pdfDoc.save('document.pdf');
}


  return (
    <div className="editor-app">
      {/* Header with app name and download buttons */}
      <header className="editor-header">
        <div className="header-content">
          <h1 className="app-title">Collaborative Editor</h1>
          <div className="download-buttons">
            <button onClick={downloadAsDocx} className="download-button">
              <Download className="download-icon" />
              DOCX
            </button>
            <button onClick={downloadAsPDF} className="download-button">
              <Download className="download-icon" />
              PDF
            </button>
          </div>
        </div>
      </header>

      {/* Main editor area */}
      <main className="editor-main">
        <div className="editor-wrapper">
          <div id="editor-container"></div>
        </div>
      </main>
    </div>
  );
}

export default App;
