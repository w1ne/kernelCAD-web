Attribute VB_Name = "CAD_ExportSTEP"
' Exports a SolidWorks assembly to one STEP AP214 file.
' Import the result with lib.fromSTEP or lib.fromCAD in kernelCAD.
' Untested against your SolidWorks build: if an API call fails, read the
' message and tell me the line; the Save As dialog can always do the same by hand.
'
' Before running: keep the .SLDASM and its
' .SLDPRT files stay in their folders. Edit the two paths below (ASM_PATH is your .SLDASM, STEP_OUT is the file to write), then run the
' macro from Tools > Macro > Run (or Alt+F8 in the VBA editor).

Option Explicit

Const ASM_PATH As String = "C:\CAD\assembly.SLDASM"
Const STEP_OUT As String = "C:\CAD\assembly.step"

Const swDocASSEMBLY As Long = 2
Const swOpenDocOptions_Silent As Long = 1
Const swSaveAsCurrentVersion As Long = 0
Const swSaveAsOptions_Silent As Long = 1

Sub CAD_ExportSTEP()
    Dim swApp As Object
    Dim model As Object
    Dim errs As Long, warns As Long
    Dim saved As Boolean

    Set swApp = Application.SldWorks
    swApp.Visible = True

    ' Opening silently keeps the window from asking about missing or
    ' out-of-date references; any reference left unresolved is reported below.
    Set model = swApp.OpenDoc6(ASM_PATH, swDocASSEMBLY, swOpenDocOptions_Silent, "", errs, warns)
    If model Is Nothing Then
        MsgBox "Could not open the assembly. Open errors=" & errs & " warnings=" & warns, vbCritical
        Exit Sub
    End If

    ' Resolve the whole assembly so every part is loaded before export.
    model.ForceRebuild3 False
    swApp.ActivateDoc3 model.GetTitle, False, 0, errs

    ' STEP AP214, one file, default export options. SolidWorks takes the STEP
    ' export settings from the document's own STEP preferences.
    saved = model.Extension.SaveAs(STEP_OUT, swSaveAsCurrentVersion, swSaveAsOptions_Silent, Nothing, errs, warns)

    If saved Then
        MsgBox "Exported: " & STEP_OUT & vbCrLf & "Save as STEP ok, errors=" & errs & " warnings=" & warns, vbInformation
    Else
        MsgBox "STEP export failed. errors=" & errs & " warnings=" & warns & vbCrLf & _
               "Use File > Save As > STEP AP214 on the open assembly instead.", vbCritical
    End If
End Sub
