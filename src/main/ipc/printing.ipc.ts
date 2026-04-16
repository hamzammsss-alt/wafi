import { ipcMain, BrowserWindow, PrinterInfo } from 'electron';

export function registerPrintingIPC() {
  // Handle print request with preview
  ipcMain.handle('print:preview', async (event) => {
    try {
      const webContents = event.sender;
      
      return new Promise((resolve, reject) => {
        webContents.print(
          {
            silent: false, // Show print dialog
            deviceName: '', // Use default printer
            margins: {
              marginType: 'default', // Default margins
            },
            landscape: false,
            scaleFactor: 100,
            copies: 1,
          },
          (success, failureReason) => {
            if (success) {
              resolve({ success: true });
            } else {
              reject(new Error(`Print failed: ${failureReason}`));
            }
          }
        );
      });
    } catch (error: any) {
      console.error('Print error:', error);
      throw new Error(`Print error: ${error.message}`);
    }
  });

  // Get available printers
  ipcMain.handle('print:getPrinters', async (event) => {
    try {
      // Return mock printers for now - getPrinters is not available in all Electron versions
      const mockPrinters: any[] = [
        {
          name: 'Default Printer',
          displayName: 'Default Printer',
        }
      ];
      return mockPrinters;
    } catch (error: any) {
      console.error('Error getting printers:', error);
      throw new Error(`Error getting printers: ${error.message}`);
    }
  });

  // Handle print to PDF
  ipcMain.handle('print:toPDF', async (event) => {
    try {
      const webContents = event.sender;
      const pdfData = await webContents.printToPDF({
        margins: {
          marginType: 'default',
          top: 0.5,
          bottom: 0.5,
          left: 0.5,
          right: 0.5,
        },
        landscape: false,
      });
      return pdfData;
    } catch (error: any) {
      console.error('Print to PDF error:', error);
      throw new Error(`Print to PDF error: ${error.message}`);
    }
  });
}
