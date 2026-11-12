import ExcelJS from 'exceljs';
import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';
import { PromoListData } from '../types/index.js';

export class ExportService {
  /**
   * Generate formatted Excel workbook for an approved promotional list.
   */
  public async generateExcel(promo: PromoListData): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'SPAR Promo Approval System';
    workbook.lastModifiedBy = 'SPAR Retail Systems';
    workbook.created = new Date();

    const sheet = workbook.addWorksheet('Approved Promo', {
      views: [{ showGridLines: true }],
      pageSetup: { orientation: 'landscape', fitToPage: true, fitToWidth: 1 },
    });

    const sparGreen = '007D32';
    const darkSlate = '1E293B';
    const lightSlate = 'F1F5F9';
    const textMuted = '64748B';

    // 1. SPAR Header Banner
    sheet.mergeCells('A1:O1');
    const headerCell = sheet.getCell('A1');
    headerCell.value = '🌲 SPAR PROMO APPROVAL SYSTEM — APPROVED PROMOTION REPORT';
    headerCell.font = { name: 'Calibri', size: 14, bold: true, color: { argb: 'FFFFFFFF' } };
    headerCell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: sparGreen },
    };
    headerCell.alignment = { vertical: 'middle', horizontal: 'center' };
    sheet.getRow(1).height = 32;

    // 2. Metadata Section
    const deptName = promo.department?.name || promo.departmentId;
    const creatorName = promo.creator
      ? `${promo.creator.firstName} ${promo.creator.lastName}`
      : 'Commercial Staff';
    const approverName = promo.headApprover
      ? `${promo.headApprover.firstName} ${promo.headApprover.lastName}`
      : promo.approvals?.find((a) => a.action === 'APPROVED')?.reviewer
      ? `${promo.approvals.find((a) => a.action === 'APPROVED')!.reviewer!.firstName} ${
          promo.approvals.find((a) => a.action === 'APPROVED')!.reviewer!.lastName
        }`
      : 'Department Head';

    const metadataRows = [
      ['Promo Code:', promo.promoCode, '', 'Department:', deptName, '', 'Status:', promo.status],
      ['Campaign Title:', promo.title, '', 'Promo Type:', promo.promoType, '', 'Version:', `v${promo.version}`],
      [
        'Start Date:',
        new Date(promo.startDate).toISOString().split('T')[0],
        '',
        'End Date:',
        new Date(promo.endDate).toISOString().split('T')[0],
        '',
        'Approved By:',
        approverName,
      ],
      ['Created By:', creatorName, '', 'Approval Date:', promo.headApprovedAt ? new Date(promo.headApprovedAt).toISOString().split('T')[0] : 'Approved', '', '', ''],
    ];

    let currentRow = 3;
    for (const mRow of metadataRows) {
      const row = sheet.getRow(currentRow);
      row.values = mRow;
      row.font = { name: 'Calibri', size: 10 };
      // Bold the labels
      ['A', 'D', 'G'].forEach((col) => {
        sheet.getCell(`${col}${currentRow}`).font = { name: 'Calibri', size: 10, bold: true, color: { argb: textMuted } };
      });
      currentRow++;
    }

    // 3. Campaign Totals KPI Bar
    currentRow++;
    sheet.mergeCells(`A${currentRow}:O${currentRow}`);
    const totalsHeader = sheet.getCell(`A${currentRow}`);
    totalsHeader.value = 'CAMPAIGN TOTALS & FORECAST PERFORMANCE';
    totalsHeader.font = { name: 'Calibri', size: 10, bold: true, color: { argb: darkSlate } };
    totalsHeader.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: lightSlate } };
    currentRow++;

    sheet.getRow(currentRow).values = [
      'Total Lines:',
      promo.promoLines?.length || 0,
      'Total Volume:',
      promo.totalVolume || 0,
      'Total Promo Sales:',
      promo.totalRevenue || 0,
      'Total Margin:',
      promo.totalMargin || 0,
      'Blended Margin %:',
      `${promo.blendedMarginPercent || 0}%`,
    ];
    sheet.getRow(currentRow).font = { name: 'Calibri', size: 10, bold: true };
    currentRow += 2;

    // 4. Promo Lines Table Headers
    const headers = [
      '#',
      'SKU / Code',
      'Product Description',
      'Barcode',
      'Normal Retail',
      'Promo Price',
      'Discount (R)',
      'Discount %',
      'Net Cost',
      'Margin (R)',
      'Margin %',
      'Est. Volume',
      'Forecast Revenue',
      'Forecast Margin',
      'Mechanic',
    ];

    const tableHeaderRow = sheet.getRow(currentRow);
    tableHeaderRow.values = headers;
    tableHeaderRow.height = 24;
    tableHeaderRow.eachCell((cell) => {
      cell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: darkSlate } };
      cell.alignment = { vertical: 'middle', horizontal: 'center' };
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' },
      };
    });

    const headerRowNum = currentRow;
    currentRow++;

    // 5. Lines Data
    const lines = promo.promoLines || [];
    let idx = 1;
    for (const line of lines) {
      const prod = line.product;
      const normalRetail = prod ? Number(prod.retailPrice) : 0;
      const promoPrice = Number(line.promoPrice) || 0;
      const discountAmount = Number(line.discountAmount) || Math.max(0, normalRetail - promoPrice);
      const discountPercent = normalRetail > 0 ? ((normalRetail - promoPrice) / normalRetail) * 100 : 0;
      const netCost = Number(line.netCost) || (prod ? Number(prod.baseCost) : 0);
      const marginAmount = Number(line.marginAmount) || (promoPrice / 1.15 - netCost);
      const marginPercent = Number(line.marginPercent) || 0;
      const volume = Number(line.estimatedVolume) || 0;
      const forecastRev = Number(line.forecastRevenue) || promoPrice * volume;
      const forecastMargin = Number(line.forecastMargin) || marginAmount * volume;

      const row = sheet.getRow(currentRow);
      row.values = [
        idx++,
        prod?.sku || line.productId,
        prod?.name || 'Product',
        prod?.barcode || '',
        normalRetail,
        promoPrice,
        discountAmount,
        discountPercent / 100,
        netCost,
        marginAmount,
        marginPercent / 100,
        volume,
        forecastRev,
        forecastMargin,
        line.mechanic || '',
      ];

      // Alternating row styling
      const isEven = idx % 2 === 0;
      row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
        cell.font = { name: 'Calibri', size: 9 };
        cell.border = {
          top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
          left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
          bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
          right: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        };
        if (isEven) {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8FAFC' } };
        }

        // Currency formatting
        if ([5, 6, 7, 9, 10, 13, 14].includes(colNumber)) {
          cell.numFmt = '"R"#,##0.00';
          cell.alignment = { horizontal: 'right' };
        }
        // Percentage formatting
        if ([8, 11].includes(colNumber)) {
          cell.numFmt = '0.00%';
          cell.alignment = { horizontal: 'right' };
        }
        // Volume formatting
        if (colNumber === 12) {
          cell.numFmt = '#,##0';
          cell.alignment = { horizontal: 'right' };
        }
      });

      currentRow++;
    }

    // 6. Summary Totals Row
    const totalsRow = sheet.getRow(currentRow);
    totalsRow.values = [
      'TOTALS',
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      promo.totalVolume || 0,
      promo.totalRevenue || 0,
      promo.totalMargin || 0,
      '',
    ];
    totalsRow.font = { name: 'Calibri', size: 10, bold: true };
    totalsRow.eachCell({ includeEmpty: true }, (cell, colNumber) => {
      cell.border = {
        top: { style: 'medium' },
        bottom: { style: 'double' },
      };
      if ([13, 14].includes(colNumber)) {
        cell.numFmt = '"R"#,##0.00';
      }
      if (colNumber === 12) {
        cell.numFmt = '#,##0';
      }
    });

    // 7. Auto-adjust column widths
    sheet.columns.forEach((col, i) => {
      const colLetter = String.fromCharCode(65 + i);
      let maxLen = headers[i] ? headers[i].length : 10;
      sheet.getColumn(colLetter).eachCell({ includeEmpty: false }, (cell) => {
        if (Number(cell.row) > headerRowNum) {
          const val = cell.value ? String(cell.value) : '';
          if (val.length > maxLen) maxLen = val.length;
        }
      });
      col.width = Math.max(maxLen + 3, 11);
    });
    sheet.getColumn(1).width = 5;
    sheet.getColumn(3).width = 32;

    const buffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(buffer);
  }

  /**
   * Generate professional PDF report for an approved promotional list.
   */
  public async generatePdf(promo: PromoListData): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({
          size: 'A4',
          layout: 'landscape',
          margins: { top: 30, bottom: 30, left: 30, right: 30 },
          info: {
            Title: `SPAR Promotion Report - ${promo.promoCode}`,
            Author: 'SPAR Promo Approval System',
          },
        });

        const chunks: Buffer[] = [];
        doc.on('data', (chunk) => chunks.push(chunk));
        doc.on('end', () => resolve(Buffer.concat(chunks)));
        doc.on('error', (err) => reject(err));

        const sparGreen = '#007D32';
        const darkSlate = '#1E293B';
        const grayText = '#64748B';
        const lightBg = '#F8FAFC';

        // Header Background Banner
        doc.rect(30, 25, 782, 45).fill(sparGreen);

        // Header Text
        doc.fillColor('#FFFFFF').fontSize(16).font('Helvetica-Bold').text('SPAR PROMOTION APPROVAL REPORT', 45, 33);
        doc
          .fontSize(9)
          .font('Helvetica')
          .text(`OFFICIAL COMMERCIAL RELEASE • ${promo.promoCode} • STATUS: APPROVED`, 45, 52);

        // Metadata grid
        let y = 80;
        doc.rect(30, y, 782, 55).fill(lightBg).stroke('#E2E8F0');

        doc.fillColor(darkSlate).fontSize(9);
        const dept = promo.department?.name || promo.departmentId;
        const startDate = new Date(promo.startDate).toISOString().split('T')[0];
        const endDate = new Date(promo.endDate).toISOString().split('T')[0];
        const approverName = promo.headApprover
          ? `${promo.headApprover.firstName} ${promo.headApprover.lastName}`
          : promo.approvals?.find((a) => a.action === 'APPROVED')?.reviewer
          ? `${promo.approvals.find((a) => a.action === 'APPROVED')!.reviewer!.firstName} ${
              promo.approvals.find((a) => a.action === 'APPROVED')!.reviewer!.lastName
            }`
          : 'Department Head';

        // Column 1
        doc.font('Helvetica-Bold').text('Campaign Title:', 45, y + 8);
        doc.font('Helvetica').text(promo.title, 130, y + 8);
        doc.font('Helvetica-Bold').text('Department:', 45, y + 23);
        doc.font('Helvetica').text(dept, 130, y + 23);
        doc.font('Helvetica-Bold').text('Promo Type:', 45, y + 38);
        doc.font('Helvetica').text(promo.promoType, 130, y + 38);

        // Column 2
        doc.font('Helvetica-Bold').text('Validity Period:', 320, y + 8);
        doc.font('Helvetica').text(`${startDate} to ${endDate}`, 405, y + 8);
        doc.font('Helvetica-Bold').text('Approved By:', 320, y + 23);
        doc.font('Helvetica').text(approverName, 405, y + 23);
        doc.font('Helvetica-Bold').text('Approval Date:', 320, y + 38);
        doc.font('Helvetica').text(promo.headApprovedAt ? new Date(promo.headApprovedAt).toISOString().split('T')[0] : 'Approved', 405, y + 38);

        // Column 3 - KPI Summary Box
        doc.font('Helvetica-Bold').text('Total Volume:', 590, y + 8);
        doc.font('Helvetica').text(`${(promo.totalVolume || 0).toLocaleString()} units`, 680, y + 8);
        doc.font('Helvetica-Bold').text('Promo Revenue:', 590, y + 23);
        doc.font('Helvetica').text(`R${Number(promo.totalRevenue || 0).toFixed(2)}`, 680, y + 23);
        doc.font('Helvetica-Bold').text('Blended Margin:', 590, y + 38);
        doc.font('Helvetica').text(`${promo.blendedMarginPercent || 0}%`, 680, y + 38);

        // Promo Lines Table
        y = 145;
        doc.rect(30, y, 782, 20).fill(darkSlate);
        doc.fillColor('#FFFFFF').fontSize(8).font('Helvetica-Bold');

        const colX = [35, 60, 120, 280, 340, 400, 460, 520, 580, 640, 710];
        doc.text('#', colX[0], y + 6);
        doc.text('SKU', colX[1], y + 6);
        doc.text('Product Description', colX[2], y + 6);
        doc.text('Barcode', colX[3], y + 6);
        doc.text('Retail', colX[4], y + 6);
        doc.text('Promo Price', colX[5], y + 6);
        doc.text('Disc %', colX[6], y + 6);
        doc.text('Net Cost', colX[7], y + 6);
        doc.text('Est. Vol', colX[8], y + 6);
        doc.text('Fcst Sales', colX[9], y + 6);
        doc.text('Fcst Margin', colX[10], y + 6);

        y += 20;
        doc.font('Helvetica').fontSize(7.5);

        const lines = promo.promoLines || [];
        let lineIdx = 1;

        for (const line of lines) {
          if (y > 520) {
            doc.addPage({ size: 'A4', layout: 'landscape', margins: { top: 30, bottom: 30, left: 30, right: 30 } });
            y = 35;
            // Repeat table header
            doc.rect(30, y, 782, 20).fill(darkSlate);
            doc.fillColor('#FFFFFF').fontSize(8).font('Helvetica-Bold');
            doc.text('#', colX[0], y + 6);
            doc.text('SKU', colX[1], y + 6);
            doc.text('Product Description', colX[2], y + 6);
            doc.text('Barcode', colX[3], y + 6);
            doc.text('Retail', colX[4], y + 6);
            doc.text('Promo Price', colX[5], y + 6);
            doc.text('Disc %', colX[6], y + 6);
            doc.text('Net Cost', colX[7], y + 6);
            doc.text('Est. Vol', colX[8], y + 6);
            doc.text('Fcst Sales', colX[9], y + 6);
            doc.text('Fcst Margin', colX[10], y + 6);
            y += 20;
            doc.font('Helvetica').fontSize(7.5);
          }

          const prod = line.product;
          const normalRetail = prod ? Number(prod.retailPrice) : 0;
          const promoPrice = Number(line.promoPrice) || 0;
          const discPercent = normalRetail > 0 ? (((normalRetail - promoPrice) / normalRetail) * 100).toFixed(1) : '0';
          const netCost = Number(line.netCost) || 0;
          const volume = Number(line.estimatedVolume) || 0;
          const fcstSales = Number(line.forecastRevenue) || 0;
          const fcstMargin = Number(line.forecastMargin) || 0;

          // Row background
          if (lineIdx % 2 === 0) {
            doc.rect(30, y, 782, 16).fill('#F8FAFC');
          }
          doc.rect(30, y, 782, 16).stroke('#E2E8F0');

          doc.fillColor(darkSlate);
          doc.text(String(lineIdx++), colX[0], y + 4);
          doc.text(prod?.sku || line.productId, colX[1], y + 4);
          const pName = (prod?.name || 'Product').substring(0, 32);
          doc.text(pName, colX[2], y + 4);
          doc.text(prod?.barcode || '-', colX[3], y + 4);
          doc.text(`R${normalRetail.toFixed(2)}`, colX[4], y + 4);
          doc.text(`R${promoPrice.toFixed(2)}`, colX[5], y + 4);
          doc.text(`${discPercent}%`, colX[6], y + 4);
          doc.text(`R${netCost.toFixed(2)}`, colX[7], y + 4);
          doc.text(volume.toLocaleString(), colX[8], y + 4);
          doc.text(`R${fcstSales.toFixed(2)}`, colX[9], y + 4);
          doc.text(`R${fcstMargin.toFixed(2)}`, colX[10], y + 4);

          y += 16;
        }

        // Totals Footer Row
        doc.rect(30, y, 782, 18).fill('#E2E8F0').stroke('#CBD5E1');
        doc.fillColor(darkSlate).font('Helvetica-Bold').fontSize(8);
        doc.text('CAMPAIGN TOTALS', colX[2], y + 5);
        doc.text((promo.totalVolume || 0).toLocaleString(), colX[8], y + 5);
        doc.text(`R${Number(promo.totalRevenue || 0).toFixed(2)}`, colX[9], y + 5);
        doc.text(`R${Number(promo.totalMargin || 0).toFixed(2)}`, colX[10], y + 5);

        // Footer Note
        y += 30;
        doc
          .fillColor(grayText)
          .fontSize(7.5)
          .font('Helvetica-Oblique')
          .text(
            'SPAR Commercial & Marketing Operations • Final Approved Promotion Record • Confidential & Proprietary',
            30,
            550,
            { align: 'center', width: 782 }
          );

        doc.end();
      } catch (err) {
        reject(err);
      }
    });
  }

  /**
   * Fill the official SPAR "Special Promo - MB, TG - Sep 2026.xlsx" workbook template
   * with promotional lines matching the exact 51-column layout and Excel formulas.
   * Also writes the populated workbook back to disk.
   */
  public async fillSpecialPromoExcel(promoData: any): Promise<Buffer> {
    const candidateTemplates = [
      path.resolve(process.cwd(), 'Special Promo - MB, TG - Sep 2026.template.xlsx'),
      path.resolve(process.cwd(), '..', 'Special Promo - MB, TG - Sep 2026.template.xlsx'),
      'e:/SPAR promo/Special Promo - MB, TG - Sep 2026.template.xlsx',
      path.resolve(process.cwd(), 'Special Promo - MB, TG - Sep 2026.xlsx'),
      path.resolve(process.cwd(), '..', 'Special Promo - MB, TG - Sep 2026.xlsx'),
      'e:/SPAR promo/Special Promo - MB, TG - Sep 2026.xlsx',
    ];

    let templatePath = candidateTemplates.find((p) => fs.existsSync(p));
    if (!templatePath) {
      throw new Error('Special Promo Excel template file could not be found.');
    }

    const candidateTargets = [
      'e:/SPAR promo/Special Promo - MB, TG - Sep 2026.xlsx',
      path.resolve(process.cwd(), 'Special Promo - MB, TG - Sep 2026.xlsx'),
      path.resolve(process.cwd(), '..', 'Special Promo - MB, TG - Sep 2026.xlsx'),
    ];
    let targetPath = candidateTargets[0];

    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(templatePath);
    const sheet = workbook.getWorksheet('PROMO DETAILS') || workbook.worksheets[0];

    const rawLines = promoData.lines || promoData.promoLines || [];

    const MASTER_LOOKUP: Record<string, any> = {
      '100245': { pos: 'P-88231', barcode: '4791002450017', desc: 'Fresh Milk 1L', dept: 'Fresh', subDept: 'Dairy', pClass: 'Chilled', segment: 'Milk', nmrp: 450, margin: 0.18, pack: 12 },
      '100391': { pos: 'P-88412', barcode: '4791003910014', desc: 'Red Onions 1kg', dept: 'Fresh', subDept: 'Vegetables', pClass: 'Produce', segment: 'Onions', nmrp: 380, margin: 0.15, pack: 20 },
      '100517': { pos: 'P-88790', barcode: '4791005170019', desc: 'Chicken Breast 500g', dept: 'Fresh', subDept: 'Meat', pClass: 'Chilled', segment: 'Poultry', nmrp: 920, margin: 0.14, pack: 10 },
      '100688': { pos: 'P-88955', barcode: '4791006880016', desc: 'Bananas (Ambul) 1kg', dept: 'Fresh', subDept: 'Fruits', pClass: 'Produce', segment: 'Bananas', nmrp: 290, margin: 0.16, pack: 15 },
      '100742': { pos: 'P-89102', barcode: '4791007420013', desc: 'Free-range Eggs x10', dept: 'Fresh', subDept: 'Dairy', pClass: 'Chilled', segment: 'Eggs', nmrp: 640, margin: 0.12, pack: 8 },
      '3000432': { pos: 'P-99120', barcode: '4791009912003', desc: 'Campion Super Basmati Rice 5kg', dept: 'Food', subDept: 'Grains & Rice', pClass: 'Dry Food', segment: 'Basmati', nmrp: 2450, margin: 0.22, pack: 4 },
    };

    let startRow = 14;
    for (let idx = 0; idx < rawLines.length; idx++) {
      const line = rawLines[idx];
      const R = startRow + idx;
      const row = sheet.getRow(R);

      const prod = line.product || {};
      const dcCode = String(line.dc || line.dcCode || prod.sku || '100245').trim();
      const masterInfo = MASTER_LOOKUP[dcCode] || {};

      const food = line.food || masterInfo.dept || prod.department?.name || 'Fresh';
      const pType = String(line.promo || line.promoType || promoData.promoType || 'SPECIAL PROMO').toUpperCase();
      const fromDate = line.from || line.fromDate || promoData.startDate || '2026-10-01';
      const toDate = line.to || line.toDate || promoData.endDate || '2026-10-30';
      const days = line.days || Math.max(1, Math.ceil((new Date(toDate).getTime() - new Date(fromDate).getTime()) / (1000 * 3600 * 24)) + 1);

      const dept = line.dept || masterInfo.dept || 'Fresh';
      const subDept = line.subDept || masterInfo.subDept || 'General';
      const pClass = line.pClass || masterInfo.pClass || 'Standard';
      const segment = line.segment || masterInfo.segment || 'General';
      const posCode = line.pos || line.posCode || masterInfo.pos || 'P-00000';
      const barcode = line.barcode || masterInfo.barcode || prod.barcode || '';
      const desc = line.desc || masterInfo.desc || prod.name || 'Promo Product';
      const status = 'ACTIVE';

      const nmrp = Number(line.nmrp || masterInfo.nmrp || prod.retailPrice || 400);
      const normalMargin = Number(line.normalMargin || line.baseMargin || masterInfo.margin || 0.15);
      const supDisc = (Number(line.supDisc ?? line.supplierDisc ?? 5)) / 100;
      const sparDisc = (Number(line.sparDisc ?? line.sparDiscount ?? 5)) / 100;

      // Mathematical formulas matching Excel
      const finalCost = nmrp - (nmrp * (normalMargin + supDisc));
      const rawSellingPrice = nmrp - (nmrp * (sparDisc + supDisc));
      const roundedSellingPrice = Math.round(rawSellingPrice / 10) * 10;
      const roundingMargin = rawSellingPrice > 0 ? (rawSellingPrice - roundedSellingPrice) / rawSellingPrice : 0;
      const finalMargin = roundedSellingPrice > 0 ? (roundedSellingPrice - finalCost) / roundedSellingPrice : 0;
      const savingAmount = nmrp - roundedSellingPrice;
      const savingPercent = nmrp > 0 ? savingAmount / nmrp : 0;

      const avg3Months = Number(line.avg3Months ?? line.avg3MonthsQty ?? 350);
      const avgPromoQty = Number(((avg3Months / 30) * days).toFixed(2));
      const avgPromoValue = Number((avgPromoQty * nmrp).toFixed(2));
      const sparContribBase = Number((avgPromoQty * (nmrp * sparDisc)).toFixed(2));
      const incSales = (normalMargin - sparDisc) > 0
        ? Number((sparContribBase / (nmrp * (normalMargin - sparDisc))).toFixed(2))
        : 0;

      const tabloid = String(line.tabloid || line.tabloidFeature || 'None');
      let salesIncPct = 0.15;
      if (pType.includes('WEHD')) salesIncPct = 0.50;
      else if (pType.includes('REWARDS')) salesIncPct = 0.80;
      else if (tabloid.toUpperCase().includes('FRONT')) salesIncPct = 0.25;
      else if (tabloid.toUpperCase().includes('INSIDER')) salesIncPct = 0.20;

      const incSales5 = Number((avgPromoQty * 0.05).toFixed(2));
      const forecastedQty = Math.ceil(avgPromoQty + (avgPromoQty * salesIncPct) + incSales5);
      const forecastedValue = Number((forecastedQty * nmrp).toFixed(2));
      const totalSavings = Number((forecastedQty * savingAmount).toFixed(2));
      const supplierContrib = Number((forecastedQty * nmrp * supDisc).toFixed(2));
      const sparContrib = Number((totalSavings - supplierContrib).toFixed(2));

      const outlet = line.outlet || line.outlets || 'All outlets';
      const comment = line.comment || line.notes || '';
      const supplierName = line.supplierName || 'SPAR Retail Distributors';

      // 51 Columns Mapping
      row.getCell(1).value = food;
      row.getCell(2).value = pType;
      row.getCell(3).value = new Date(fromDate);
      row.getCell(4).value = new Date(toDate);
      row.getCell(5).value = { formula: `D${R}-C${R}+1`, result: days };
      row.getCell(6).value = dept;
      row.getCell(7).value = subDept;
      row.getCell(8).value = pClass;
      row.getCell(9).value = segment;
      row.getCell(10).value = dcCode;
      row.getCell(11).value = posCode;
      row.getCell(12).value = barcode;
      row.getCell(13).value = desc;
      row.getCell(14).value = status;
      row.getCell(15).value = nmrp;
      row.getCell(16).value = normalMargin;
      row.getCell(17).value = supDisc;
      row.getCell(18).value = sparDisc;
      row.getCell(19).value = { formula: `O${R}-(O${R}*(P${R}+Q${R}))`, result: finalCost };
      row.getCell(20).value = { formula: `O${R}-(O${R}*(R${R}+Q${R}))`, result: rawSellingPrice };
      row.getCell(21).value = { formula: `MROUND(T${R},10)`, result: roundedSellingPrice };
      row.getCell(22).value = { formula: `(T${R}-U${R})/T${R}`, result: roundingMargin };
      row.getCell(23).value = { formula: `(U${R}-S${R})/U${R}`, result: finalMargin };
      row.getCell(24).value = { formula: `O${R}-U${R}`, result: savingAmount };
      row.getCell(25).value = { formula: `X${R}/O${R}`, result: savingPercent };
      row.getCell(26).value = supplierName;
      row.getCell(27).value = comment;
      row.getCell(28).value = idx + 1;
      row.getCell(29).value = avg3Months;
      row.getCell(30).value = forecastedQty;
      row.getCell(31).value = tabloid;
      row.getCell(32).value = Number(line.previousMonth ?? line.previousMonthQty ?? 340);
      row.getCell(33).value = Number(line.lastYear ?? line.lastYearQty ?? 310);
      row.getCell(34).value = avg3Months;
      row.getCell(35).value = Number(line.salesNet ?? 11434);
      row.getCell(36).value = 725;
      row.getCell(37).value = 2;
      row.getCell(38).value = 2;
      row.getCell(39).value = idx + 1;
      row.getCell(40).value = { formula: `AH${R}/30*E${R}`, result: avgPromoQty };
      row.getCell(41).value = { formula: `AN${R}*O${R}`, result: avgPromoValue };
      row.getCell(42).value = { formula: `AN${R}*(O${R}*R${R})`, result: sparContribBase };
      row.getCell(43).value = { formula: `IF((P${R}-R${R})>0, AP${R}/(O${R}*(P${R}-R${R})), 0)`, result: incSales };
      row.getCell(44).value = { formula: `IF(B${R}="WEHD",0.5,(IF(B${R}="REWARDS",0.8,(IF(AE${R}="FRONT",0.25,(IF(AE${R}="INSIDER",0.2,0.15))))))`, result: salesIncPct };
      row.getCell(45).value = { formula: `AN${R}*0.05`, result: incSales5 };
      row.getCell(46).value = { formula: `CEILING(SUM(AN${R},(AN${R}*AR${R}),AS${R}),1)`, result: forecastedQty };
      row.getCell(47).value = { formula: `AT${R}*O${R}`, result: forecastedValue };
      row.getCell(48).value = { formula: `AT${R}*X${R}`, result: totalSavings };
      row.getCell(49).value = { formula: `AT${R}*O${R}*Q${R}`, result: supplierContrib };
      row.getCell(50).value = { formula: `AV${R}-AW${R}`, result: sparContrib };
      row.getCell(51).value = outlet;

      row.commit();
    }

    // Write back to disk
    try {
      await workbook.xlsx.writeFile(targetPath);
      console.log(`[ExportService] Successfully filled and persisted "${targetPath}" with ${rawLines.length} promo lines.`);
    } catch (saveErr) {
      console.warn(`[ExportService] Warning: Could not write file directly to disk at "${targetPath}":`, saveErr);
    }

    const buffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(buffer);
  }
}

export const exportService = new ExportService();
