@echo off
set /p pdfPath="Enter PDF Path: "
set /p mockId="Enter Mock ID (leave empty for PYQ mode): "

if "%mockId%"=="" (
    set /p exam="Enter Exam Type (e.g. GATE): "
    set /p branch="Enter Branch (e.g. CSE): "
    set /p year="Enter Year (e.g. 2010): "
    echo Starting PYQ explanation generation...
    npx tsx scripts/pdf_explanation_generator.ts "%pdfPath%" %exam% %branch% %year%
) else (
    echo Starting Mock explanation generation for ID %mockId%...
    npx tsx scripts/pdf-mock-explanations.ts "%pdfPath%" %mockId%
)

pause
