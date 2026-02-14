const puppeteer = require('puppeteer');
const Setting = require('../models/Setting');

async function generateReceipt(sale) {
  const settings = (await Setting.findOne()) || {
    businessName: 'POS SYSTEM',
    tagline: 'Point of Sale Receipt',
    address: '',
    phone: '',
    website: '',
    logo: '/uploads/default-logo.png',
    showChange: true,
    showCashier: true,
    showQRCode: true,
    thankYouMessage: 'Thank you for your purchase! Please come again ♥'
  };

  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  try {
    const page = await browser.newPage();

    // Generate QR Code URL (Data URI for cleaner PDF embedding)
    // Using a public-ready QR generator service for simplicity in this script, 
    // but local generation is also possible.
    const qrContent = settings.qrCodeLink || `https://wa.me/${settings.whatsapp}`;
    const qrUrl = settings.showQRCode ? `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(qrContent)}` : '';

    // Create HTML content for professional receipt
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;700;900&display=swap');
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { 
            font-family: 'Inter', sans-serif; 
            padding: 20px; 
            width: ${settings.receiptWidth === '58mm' ? '300px' : '400px'}; 
            color: #111;
            line-height: 1.4;
          }
          .header { text-align: center; margin-bottom: 20px; }
          .logo { max-width: 150px; height: auto; margin-bottom: 10px; filter: grayscale(1); }
          .business-name { font-size: 20px; font-weight: 900; text-transform: uppercase; letter-spacing: -1px; margin-bottom: 2px; }
          .tagline { font-size: 11px; color: #666; font-weight: 700; text-transform: uppercase; margin-bottom: 5px; }
          .address { font-size: 10px; color: #444; max-width: 250px; margin: 0 auto; }
          
          .divider { border-top: 1px dotted #000; margin: 15px 0; }
          .receipt-title { font-size: 14px; font-weight: 900; text-align: center; margin-bottom: 10px; border: 1px solid #000; padding: 4px; display: inline-block; width: 100%; }
          
          .info-table { width: 100%; font-size: 11px; margin-bottom: 15px; }
          .info-table td { padding: 2px 0; }
          .label { color: #666; }
          
          table.items { width: 100%; border-collapse: collapse; margin-bottom: 15px; font-size: 11px; }
          table.items th { border-top: 1px solid #000; border-bottom: 1px solid #000; padding: 8px 0; text-align: left; }
          table.items td { padding: 8px 0; border-bottom: 1px solid #eee; }
          .right { text-align: right; }
          .center { text-align: center; }
          
          .totals { margin-top: 10px; width: 100%; }
          .total-row { display: flex; justify-content: space-between; padding: 4px 0; font-size: 12px; }
          .grand-total { font-size: 18px; font-weight: 900; border-top: 1.5px solid #000; padding-top: 8px; margin-top: 8px; }
          
          .payment-details { background: #f9f9f9; padding: 10px; border-radius: 4px; margin-top: 15px; font-size: 11px; }
          .payment-details div { display: flex; justify-content: space-between; margin-bottom: 2px; }
          
          .footer { text-align: center; margin-top: 30px; }
          .thanks { font-size: 11px; font-weight: 700; margin-bottom: 15px; }
          .qr-code { width: 100px; height: 100px; margin: 0 auto 10px; }
          .contact-info { font-size: 9px; color: #666; }
          
          @media print {
            body { padding: 0; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          ${settings.logo ? `<img src="http://localhost:${process.env.PORT || 3000}${settings.logo}" class="logo">` : ''}
          <div class="business-name">${settings.businessName}</div>
          <div class="tagline">${settings.tagline}</div>
          <div class="address">${settings.address}</div>
        </div>

        <div class="divider"></div>
        <div class="receipt-title">${settings.receiptTitle || 'POS RECEIPT'}</div>
        
        <table class="info-table">
          <tr>
            <td class="label">Receipt #:</td>
            <td class="right"><strong>${sale._id.toString().slice(-8).toUpperCase()}</strong></td>
          </tr>
          <tr>
            <td class="label">Date:</td>
            <td class="right">${new Date(sale.createdAt).toLocaleDateString()} ${new Date(sale.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</td>
          </tr>
          ${settings.showCashier ? `
            <tr>
              <td class="label">Cashier:</td>
              <td class="right">${sale.cashierName}</td>
            </tr>
          ` : ''}
          <tr>
            <td class="label">Payment:</td>
            <td class="right"><strong>${sale.paymentMethod.toUpperCase()}</strong></td>
          </tr>
        </table>

        <table class="items">
          <thead>
            <tr>
              <th>Item</th>
              <th class="center">Qty</th>
              <th class="right">Total</th>
            </tr>
          </thead>
          <tbody>
            ${sale.items.map(item => `
              <tr>
                <td>
                  <div style="font-weight: 700;">${item.productName}</div>
                  <div style="font-size: 9px; color: #666;">@ ${item.price.toLocaleString()}</div>
                </td>
                <td class="center">${item.quantity}</td>
                <td class="right"><strong>${item.subtotal.toLocaleString()}</strong></td>
              </tr>
            `).join('')}
          </tbody>
        </table>

        <div class="totals">
          <div class="total-row">
            <span>Subtotal</span>
            <span>PKR ${sale.subtotal.toLocaleString()}</span>
          </div>
          ${sale.discountAmount > 0 ? `
            <div class="total-row" style="color: #666;">
              <span>Discount</span>
              <span>- PKR ${sale.discountAmount.toLocaleString()}</span>
            </div>
          ` : ''}
          <div class="total-row grand-total">
            <span>TOTAL</span>
            <span>PKR ${sale.total.toLocaleString()}</span>
          </div>
        </div>

        ${(settings.showChange && sale.paymentMethod === 'cash') ? `
          <div class="payment-details">
            <div>
              <span>Cash Received</span>
              <span>PKR ${sale.cashReceived.toLocaleString()}</span>
            </div>
            <div style="font-weight: 900; border-top: 1px solid #ddd; padding-top: 4px; margin-top: 4px;">
              <span>Change Returned</span>
              <span>PKR ${sale.changeAmount.toLocaleString()}</span>
            </div>
          </div>
        ` : ''}

        <div class="footer">
          <p class="thanks">${settings.thankYouMessage}</p>
          
          ${settings.showQRCode ? `
            <div class="qr-label" style="font-size: 9px; font-weight: 900; margin-bottom: 5px; text-transform: uppercase;">Scan To Rate Us / Follow</div>
            <img src="${qrUrl}" class="qr-code">
          ` : ''}

          <div class="contact-info">
            ${settings.website ? `${settings.website} | ` : ''} ${settings.phone ? settings.phone : ''}
            ${settings.instagram ? `<div style="margin-top: 2px;">Instagram: ${settings.instagram}</div>` : ''}
          </div>
        </div>
      </body>
      </html>
    `;

    await page.setContent(html);
    const pdf = await page.pdf({
      width: settings.receiptWidth === '58mm' ? '58mm' : '80mm',
      printBackground: true,
      margin: { top: '5mm', right: '5mm', bottom: '5mm', left: '5mm' }
    });

    return pdf;
  } finally {
    await browser.close();
  }
}

module.exports = { generateReceipt };
