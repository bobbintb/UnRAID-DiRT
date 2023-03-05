import os
import xlsxwriter

# Set the directory to scan
directory = "/mnt/user/other"

# Create a new Excel workbook
workbook = xlsxwriter.Workbook('file_attributes.xlsx')

# Create a worksheet to store the file attributes
worksheet = workbook.add_worksheet()

# Write the headers for the file attributes
headers = ['File Name', 'Size (bytes)', 'Creation Time', 'Last Modified Time', 'Last Access Time', 'Inode Links']
for i, header in enumerate(headers):
    worksheet.write(0, i, header)

# Initialize row counter
row = 1

# Walk through the directory and all subdirectories
for root, dirs, files in os.walk(directory):
    for file in files:
        # Get the full path of the file
        filepath = os.path.join(root, file)

        # Get the file attributes using os.stat
        statinfo = os.stat(filepath)

        # Write the file attributes to the Excel worksheet
        worksheet.write(row, 0, file)
        worksheet.write(row, 1, statinfo.st_size)
        worksheet.write(row, 2, statinfo.st_ctime)
        worksheet.write(row, 3, statinfo.st_mtime)
        worksheet.write(row, 4, statinfo.st_atime)
        worksheet.write(row, 5, statinfo.st_nlink)

        # Increment row counter
        row += 1

# Close the workbook
workbook.close()

print("File attributes saved to file_attributes.xlsx")
