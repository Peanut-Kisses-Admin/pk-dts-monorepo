param(
    [string]$OutputPath = (Join-Path $PSScriptRoot 'PK-DTS-System-Presentation.pptx')
)

$ErrorActionPreference = 'Stop'
$ppt = New-Object -ComObject PowerPoint.Application
$ppt.Visible = -1
$deck = $ppt.Presentations.Add()
$deck.PageSetup.SlideWidth = 960
$deck.PageSetup.SlideHeight = 540

$W = 960; $H = 540
$C = @{ Red=0x1B1B99; Crimson=0x19197F; Ink=0x171717; Gray=0x6B7280; Line=0xE5E7EB; Soft=0xF8F8FA; Rose=0xF2F2FE; White=0xFFFFFF; Green=0x348047; Amber=0x1B77B4 }
$logo = Join-Path $PSScriptRoot '..\public\images\peanut_kisses_logo-removebg-preview.png'
$cover = Join-Path $PSScriptRoot '..\public\images\pk-building-cover.png'

function Add-Text($slide,$text,$x,$y,$w,$h,$size=18,$color=$C.Ink,$bold=$false,$font='Aptos',$align=1) {
    $text = ([string]$text).Replace('`n', [Environment]::NewLine)
    $s=$slide.Shapes.AddTextbox(1,$x,$y,$w,$h); $s.TextFrame2.TextRange.Text=$text
    $s.TextFrame2.TextRange.Font.Name=$font; $s.TextFrame2.TextRange.Font.Size=$size; $s.TextFrame2.TextRange.Font.Bold=[int]$bold; $s.TextFrame2.TextRange.Font.Fill.ForeColor.RGB=$color
    $s.TextFrame2.TextRange.ParagraphFormat.Alignment=$align; $s.TextFrame2.MarginLeft=0; $s.TextFrame2.MarginRight=0; $s.TextFrame2.MarginTop=0; $s.TextFrame2.MarginBottom=0
    return $s
}
function Add-Box($slide,$x,$y,$w,$h,$fill=$C.White,$radius=5,$line=$C.Line) {
    $s=$slide.Shapes.AddShape($radius,$x,$y,$w,$h); $s.Fill.ForeColor.RGB=$fill; $s.Line.ForeColor.RGB=$line; $s.Line.Weight=1
    return $s
}
function Add-Title($slide,$kicker,$title,$subtitle='') {
    Add-Text $slide $kicker.ToUpper() 54 32 700 18 10 $C.Red $true | Out-Null
    Add-Text $slide $title 54 54 820 46 28 $C.Ink $true | Out-Null
    if($subtitle){Add-Text $slide $subtitle 54 104 830 28 13 $C.Gray $false | Out-Null}
    $bar=$slide.Shapes.AddShape(1,54,24,34,4); $bar.Fill.ForeColor.RGB=$C.Red; $bar.Line.Visible=0
}
function Add-Footer($slide,$n,$section='PK DTS') {
    Add-Text $slide $section 54 510 300 14 8 $C.Gray $true | Out-Null
    Add-Text $slide ("{0:D2}" -f $n) 870 508 36 16 9 $C.Red $true 'Aptos' 3 | Out-Null
}
function Add-Card($slide,$x,$y,$w,$h,$title,$body,$accent=$C.Red,$tag='') {
    Add-Box $slide $x $y $w $h $C.White 5 $C.Line | Out-Null
    $mark=$slide.Shapes.AddShape(1,$x,$y,5,$h); $mark.Fill.ForeColor.RGB=$accent; $mark.Line.Visible=0
    if($tag){Add-Text $slide $tag.ToUpper() ($x+18) ($y+15) ($w-35) 14 9 $accent $true | Out-Null}
    $titleOffset=18; $bodyOffset=52
    if($tag){$titleOffset=34; $bodyOffset=66}
    Add-Text $slide $title ($x+18) ($y+$titleOffset) ($w-35) 26 16 $C.Ink $true | Out-Null
    Add-Text $slide $body ($x+18) ($y+$bodyOffset) ($w-35) ($h-72) 11 $C.Gray $false | Out-Null
}
function Add-Step($slide,$n,$title,$body,$x,$y,$w=165,$accent=$C.Red) {
    Add-Box $slide $x $y $w 112 $C.White 5 $C.Line | Out-Null
    $dot=$slide.Shapes.AddShape(9,$x+14,$y+14,28,28); $dot.Fill.ForeColor.RGB=$accent; $dot.Line.Visible=0
    Add-Text $slide ([string]$n) ($x+14) ($y+19) 28 15 10 $C.White $true 'Aptos' 2 | Out-Null
    Add-Text $slide $title ($x+52) ($y+15) ($w-64) 24 13 $C.Ink $true | Out-Null
    Add-Text $slide $body ($x+14) ($y+52) ($w-28) 48 10 $C.Gray | Out-Null
}
function Add-Pill($slide,$text,$x,$y,$w,$fill=$C.Rose,$color=$C.Crimson) {
    $p=Add-Box $slide $x $y $w 25 $fill 5 $fill; Add-Text $slide $text ($x+6) ($y+6) ($w-12) 12 9 $color $true 'Aptos' 2 | Out-Null
}
function Add-Screen($slide,$x,$y,$w,$h,$title,$role='STAFF') {
    Add-Box $slide $x $y $w $h $C.White 5 0xD4D4D8 | Out-Null
    $top=$slide.Shapes.AddShape(1,$x,$y,$w,30); $top.Fill.ForeColor.RGB=0x18181B; $top.Line.Visible=0
    foreach($dx in @(12,25,38)){ $dot=$slide.Shapes.AddShape(9,$x+$dx,$y+11,7,7); $dot.Fill.ForeColor.RGB=0x71717A; $dot.Line.Visible=0 }
    Add-Text $slide 'PK DOCUMENT TRACKING' ($x+58) ($y+9) ($w-170) 12 7 $C.White $true | Out-Null
    Add-Pill $slide $role ($x+$w-86) ($y+4) 68 $C.Red $C.White
    $side=$slide.Shapes.AddShape(1,$x,$y+30,92,$h-30); $side.Fill.ForeColor.RGB=0xF4F4F5; $side.Line.Visible=0
    Add-Text $slide 'Dashboard`n`nDocuments`n`nRequests`n`nNotifications' ($x+12) ($y+52) 70 ($h-66) 8 $C.Gray $true | Out-Null
    Add-Text $slide $title ($x+112) ($y+48) ($w-130) 22 15 $C.Ink $true | Out-Null
    return @{ ContentX=$x+112; ContentY=$y+84; ContentW=$w-130; ContentH=$h-100 }
}
function New-Slide($index,$section='PK DTS') {
    $slide=$deck.Slides.Add($deck.Slides.Count+1,12); $slide.Background.Fill.ForeColor.RGB=$C.Soft
    Add-Footer $slide $index $section
    return $slide
}

# 1 - Cover
$s=New-Slide 1 'SYSTEM PRESENTATION'
if(Test-Path $cover){$s.Shapes.AddPicture($cover,0,-1,0,0,$W,$H) | Out-Null}
$overlay=$s.Shapes.AddShape(1,0,0,$W,$H); $overlay.Fill.ForeColor.RGB=$C.Ink; $overlay.Fill.Transparency=0.12; $overlay.Line.Visible=0
$panel=$s.Shapes.AddShape(1,0,0,565,$H); $panel.Fill.ForeColor.RGB=$C.Ink; $panel.Fill.Transparency=0.04; $panel.Line.Visible=0
if(Test-Path $logo){$s.Shapes.AddPicture($logo,0,-1,54,42,72,72) | Out-Null}
Add-Text $s 'PEANUT KISSES' 142 50 300 18 11 $C.White $true | Out-Null
Add-Text $s 'Document Tracking System (DTS)' 54 155 480 104 34 $C.White $true | Out-Null
Add-Text $s 'A complete guide to secure document creation, storage, access, approval, retrieval, disposal, and accountability.' 54 280 450 72 15 0xD6D3D1 | Out-Null
Add-Pill $s 'SYSTEM OVERVIEW' 54 384 132 $C.Red $C.White
Add-Pill $s 'PROCESS GUIDE' 196 384 124 0x333333 $C.White
Add-Pill $s 'USER TUTORIAL' 330 384 118 0x333333 $C.White
Add-Text $s 'Presentation deck | 2026' 54 472 300 16 10 0xD6D3D1 | Out-Null

# 2 - Executive overview
$s=New-Slide 2 'OVERVIEW'; Add-Title $s 'Executive overview' 'One controlled workspace for every document' 'PK DTS connects records, files, physical locations, people, decisions, and evidence.'
Add-Card $s 54 155 258 255 'Central register' 'One authoritative catalog for both physical and digital documents. Search by title, number, owner, file, asset, area, or location.' $C.Red 'CONTROL'
Add-Card $s 350 155 258 255 'Governed access' 'Users see only what their role and document assignments allow. Administrators manage roles, permissions, and account status.' $C.Ink 'SECURITY'
Add-Card $s 646 155 258 255 'Traceable lifecycle' 'Requests, approvals, revisions, attachments, disposal, restoration, notifications, and authenticated actions are retained as an accountable trail.' $C.Green 'TRACEABILITY'
Add-Text $s 'Presentation message' 54 438 160 16 10 $C.Red $true | Out-Null
Add-Text $s 'The system does not only store files - it controls the complete life of a document.' 190 436 714 24 14 $C.Ink $true | Out-Null

# 3 - Problem and solution
$s=New-Slide 3 'OVERVIEW'; Add-Title $s 'Why the system exists' 'From scattered records to controlled information' 'The presentation can frame the project as a direct answer to common document-management risks.'
$problems=@('Files stored in unrelated folders','Paper records difficult to locate','Unclear ownership and access','No consistent approval history','Disposal decisions hard to prove')
$solutions=@('One searchable document register','Mapped physical storage route','Role plus assignment-based access','Visible request and review workflow','Audited disposal and restoration')
Add-Text $s 'BEFORE' 65 155 310 18 11 $C.Gray $true | Out-Null; Add-Text $s 'WITH PK DTS' 545 155 310 18 11 $C.Red $true | Out-Null
for($i=0;$i -lt 5;$i++){
    Add-Box $s 54 (185+$i*53) 355 40 0xF3F4F6 5 $C.Line | Out-Null; Add-Text $s 'X' 70 (194+$i*53) 20 18 14 $C.Gray $true | Out-Null; Add-Text $s $problems[$i] 102 (197+$i*53) 286 17 11 $C.Gray | Out-Null
    Add-Box $s 530 (185+$i*53) 374 40 $C.White 5 $C.Line | Out-Null; Add-Text $s 'OK' 542 (194+$i*53) 28 18 10 $C.Green $true | Out-Null; Add-Text $s $solutions[$i] 578 (197+$i*53) 305 17 11 $C.Ink $true | Out-Null
}
$arrow=$s.Shapes.AddShape(33,445,270,42,42); $arrow.Fill.ForeColor.RGB=$C.Red; $arrow.Line.Visible=0

# 4 - Client journey
$s=New-Slide 4 'HOW IT WORKS'; Add-Title $s 'The document journey' 'A simple process from receipt to final action' 'Every step has a clear owner, status, and history.'
$journey=@(@('Receive','A document arrives as paper or a digital file.'),@('Register','Staff records its title, number, type, and owner.'),@('Organize','Map a physical location or choose a digital folder.'),@('Review','The right people check, approve, and update it.'),@('Retrieve','Authorized users search, open, or locate the record.'))
for($i=0;$i -lt 5;$i++){Add-Step $s ($i+1) $journey[$i][0] $journey[$i][1] (35+$i*185) 175 170}
Add-Card $s 125 335 710 90 'The result' 'Staff spend less time searching, managers see the current status, and clients receive a consistent, accountable service.' $C.Red 'CLEAR AND CONTROLLED'

# 5 - Roles
$s=New-Slide 5 'ACCESS CONTROL'; Add-Title $s 'Roles and responsibilities' 'Every user sees a workspace appropriate to the job' 'Actual access is controlled by both role permissions and document-specific assignments.'
Add-Card $s 54 150 260 272 'Administrator' '- Configure storage catalogs`n- Manage users and roles`n- Create and manage documents`n- Review requests and disposal`n- Run backups and view audit logs' $C.Red 'FULL GOVERNANCE'
Add-Card $s 350 150 260 272 'Staff' '- Work with permitted documents`n- Create requests`n- Upload attachments or revisions when allowed`n- Track personal request status`n- Receive workflow notifications' $C.Ink 'DAILY OPERATIONS'
Add-Card $s 646 150 260 272 'Viewer / Auditor' '- See assigned records only`n- Review document details and evidence`n- Follow mapped hardcopy routes`n- No broad edit access unless explicitly permitted' $C.Green 'CONTROLLED VIEW'
Add-Pill $s 'ROLE PERMISSION' 210 448 145
Add-Text $s '+' 366 448 30 22 16 $C.Red $true 'Aptos' 2 | Out-Null
Add-Pill $s 'DOCUMENT ASSIGNMENT' 408 448 176
Add-Text $s '=' 596 448 30 22 16 $C.Red $true 'Aptos' 2 | Out-Null
Add-Pill $s 'VISIBLE & ALLOWED' 638 448 150 $C.Ink $C.White

# 6 - Sign-in and safety
$s=New-Slide 6 'USER TUTORIAL'; Add-Title $s 'Getting started securely' 'Sign in with your own account' 'Your role determines the pages and actions available after login.'
Add-Step $s 1 'Open PK DTS' 'Use the approved address provided by your organization.' 54 165 220
Add-Step $s 2 'Enter your account' 'Type your assigned email and password.' 54 292 220
Add-Step $s 3 'Check your role' 'Confirm your name and role in the top-right account menu.' 54 419 220
$ui=Add-Screen $s 310 150 594 320 'Welcome back' 'SIGN IN'
Add-Text $s 'Email address' $ui.ContentX $ui.ContentY 180 14 9 $C.Gray $true | Out-Null; Add-Box $s $ui.ContentX ($ui.ContentY+20) 320 34 0xFAFAFA 5 $C.Line | Out-Null
Add-Text $s 'Password' $ui.ContentX ($ui.ContentY+70) 180 14 9 $C.Gray $true | Out-Null; Add-Box $s $ui.ContentX ($ui.ContentY+90) 320 34 0xFAFAFA 5 $C.Line | Out-Null
Add-Box $s $ui.ContentX ($ui.ContentY+145) 320 38 $C.Red 5 $C.Red | Out-Null; Add-Text $s 'Sign in securely' $ui.ContentX ($ui.ContentY+157) 320 15 10 $C.White $true 'Aptos' 2 | Out-Null
Add-Text $s 'Leave Remember me off on a shared computer. Always sign out when finished.' $ui.ContentX ($ui.ContentY+205) 390 34 10 $C.Crimson $true | Out-Null

# 7 - Dashboard
$s=New-Slide 7 'USER TUTORIAL'; Add-Title $s 'Dashboard tour' 'Start with the operational picture' 'The dashboard summarizes the workload and provides fast routes into the document lifecycle.'
$metrics=@(@('Total documents','Complete controlled register'),@('Hardcopy','Physical records and locations'),@('Softcopy','Digital files and revisions'),@('Pending work','Requests awaiting action'))
for($i=0;$i -lt 4;$i++){ $x=54+$i*214; Add-Box $s $x 155 190 100 $C.White 5 $C.Line | Out-Null; Add-Text $s ([string]($i+1)) ($x+16) 170 36 30 22 $C.Red $true | Out-Null; Add-Text $s $metrics[$i][0] ($x+62) 170 112 20 13 $C.Ink $true | Out-Null; Add-Text $s $metrics[$i][1] ($x+16) 211 158 28 9 $C.Gray | Out-Null }
Add-Card $s 54 285 405 150 'What to review first' '1. Pending approvals`n2. New notifications`n3. Recent documents`n4. Storage or request exceptions' $C.Red 'DAILY CHECK'
Add-Card $s 499 285 405 150 'How to navigate' 'Use the left sidebar for document types, folders, requests, administration, and system tools. The top title always confirms the current workspace.' $C.Ink 'ORIENTATION'

# 8 - Types
$s=New-Slide 8 'DOCUMENT LIFECYCLE'; Add-Title $s 'Two document types' 'One register, two storage realities' 'The same controls apply, but retrieval information differs between physical and digital records.'
Add-Card $s 54 155 405 260 'Hardcopy document' 'Stored as an original physical item.`n`nKey information:`n- Area`n- Specific storage`n- Location`n- Asset number`n- Sequence`n- Attached scan evidence' $C.Red 'PHYSICAL'
Add-Card $s 499 155 405 260 'Softcopy document' 'Stored as a controlled digital file.`n`nKey information:`n- Category folder`n- Current file`n- Revision number`n- Revision reason`n- Uploader and date`n- Supporting attachments' $C.Ink 'DIGITAL'
Add-Text $s 'Both types include title, number, creator, requester, status, assignment, dates, and audit activity.' 115 450 730 24 13 $C.Crimson $true 'Aptos' 2 | Out-Null

# 9 - Hardcopy workflow
$s=New-Slide 9 'HARDCOPY TUTORIAL'; Add-Title $s 'Hardcopy workflow' 'Register -> map -> assign -> retrieve' 'A hardcopy record must tell the next person exactly where the original can be found.'
$steps=@(@('Register','Create the title, number, requester, and record status.'),@('Map storage','Select Area -> Specific -> Location, plus Asset and Sequence.'),@('Attach evidence','Upload scans or supporting files without replacing the original.'),@('Assign access','Choose the users who are allowed to discover and view the record.'),@('Retrieve','Follow the route and confirm asset/sequence before removing the copy.'))
for($i=0;$i -lt 5;$i++){Add-Step $s ($i+1) $steps[$i][0] $steps[$i][1] (35+$i*185) 180 170}
Add-Box $s 110 340 740 80 $C.Ink 5 $C.Ink | Out-Null
Add-Text $s 'Example storage route' 132 355 170 15 9 0xFCA5A5 $true | Out-Null
Add-Text $s 'ADMIN OFFICE  >  BACK OFFICE STORAGE  >  DU' 132 380 695 25 17 $C.White $true 'Aptos' 2 | Out-Null

# 10 - Softcopy workflow
$s=New-Slide 10 'SOFTCOPY TUTORIAL'; Add-Title $s 'Softcopy workflow' 'Upload once, revise with control' 'The current file stays clear while every revision remains traceable.'
Add-Step $s 1 'Choose folder' 'Select the correct softcopy category or create the approved folder structure.' 54 165 190 $C.Ink
Add-Step $s 2 'Create record' 'Enter document metadata and upload the first controlled file.' 268 165 190 $C.Ink
Add-Step $s 3 'Assign users' 'Grant visibility only to the staff who require the document.' 482 165 190 $C.Ink
Add-Step $s 4 'Upload revision' 'Provide a new file and explain the reason for revision.' 696 165 190 $C.Ink
Add-Card $s 54 315 405 115 'Current revision' 'The document points to the latest approved working file for normal use.' $C.Red 'NOW'
Add-Card $s 499 315 405 115 'Revision history' 'Earlier versions retain file name, revision number, uploader, date, and reason.' $C.Green 'HISTORY'
Add-Text $s 'Rule: never overwrite history manually. Use Upload Revision so the system records the change.' 54 455 850 22 12 $C.Crimson $true 'Aptos' 2 | Out-Null

# 11 - Requests and approval
$s=New-Slide 11 'WORKFLOW'; Add-Title $s 'Request and approval process' 'Decisions move through a visible queue' 'The requester and reviewer each have a dedicated workspace.'
$labels=@('User submits request','My Requests tracks status','Reviewer opens Approval Review','Approve or reject with context','Document status updates')
for($i=0;$i -lt 5;$i++){ $x=45+$i*180; $fill=if($i -eq 4){$C.Green}else{$C.White}; $color=if($i -eq 4){$C.White}else{$C.Ink}; Add-Box $s $x 205 160 88 $fill 5 $C.Line | Out-Null; Add-Text $s ([string]($i+1)) ($x+14) 219 20 16 11 $C.Red $true | Out-Null; Add-Text $s $labels[$i] ($x+14) 244 132 34 11 $color $true 'Aptos' 2 | Out-Null; if($i -lt 4){Add-Text $s '>' ($x+163) 237 18 20 16 $C.Red $true | Out-Null} }
Add-Card $s 135 340 690 88 'Notification loop' 'Badges and the notification center surface new requests, decisions, assignments, and document updates. Opening an item marks it read and navigates to the relevant workspace.' $C.Red 'KEEP WORK MOVING'

# 12 - Assignment
$s=New-Slide 12 'ACCESS CONTROL'; Add-Title $s 'Document assignment' 'Give access deliberately - not broadly' 'Assignment metadata is visible but read-only to ordinary users.'
Add-Card $s 54 158 260 238 'Administrator' 'Selects one or more users, confirms the document, and saves the assignment. The system records who assigned access and when.' $C.Red 'ASSIGNS'
Add-Card $s 350 158 260 238 'Assigned user' 'Can discover and open the document only when the role also permits the requested action.' $C.Green 'USES'
Add-Card $s 646 158 260 238 'Unassigned user' 'Does not receive the document in listings, search, dashboard data, detail views, or revision routes.' $C.Ink 'RESTRICTED'
Add-Pill $s 'CONTROLLED ACCESS' 240 435 160 $C.Ink $C.White
Add-Text $s 'applies wherever the user searches, opens, or reviews a document' 418 441 390 15 11 $C.Gray $true | Out-Null

# 13 - Search and detail tutorial
$s=New-Slide 13 'USER TUTORIAL'; Add-Title $s 'Find and inspect a document' 'Search first, then narrow with Advanced filters' 'Hardcopy and Softcopy workspaces automatically show the filters that belong to that document type.'
Add-Step $s 1 'Choose workspace' 'Open Hardcopy Documents or Softcopy Documents.' 54 165 220
Add-Step $s 2 'Type keywords' 'Search by number, title, person, asset, area, or filename.' 54 292 220
Add-Step $s 3 'Open Advanced' 'Use status, assignment, folder, or storage fields to narrow results.' 54 419 220
$ui=Add-Screen $s 310 150 594 320 'Hardcopy Document Module' 'VIEWER'
Add-Box $s $ui.ContentX $ui.ContentY $ui.ContentW 38 0xFAFAFA 5 $C.Line | Out-Null; Add-Text $s 'Search number, title, creator, asset, area...' ($ui.ContentX+12) ($ui.ContentY+12) 310 14 9 $C.Gray | Out-Null
Add-Box $s ($ui.ContentX+$ui.ContentW-104) ($ui.ContentY+4) 98 30 0xFEE2E2 5 0xFECACA | Out-Null; Add-Text $s 'Advanced  2' ($ui.ContentX+$ui.ContentW-96) ($ui.ContentY+13) 82 12 8 $C.Crimson $true 'Aptos' 2 | Out-Null
Add-Box $s $ui.ContentX ($ui.ContentY+48) $ui.ContentW 142 $C.White 5 $C.Line | Out-Null
Add-Text $s 'ADVANCED SEARCH' ($ui.ContentX+14) ($ui.ContentY+62) 180 14 9 $C.Red $true | Out-Null
$filters=@('Status: Approved','Assignment: Assigned','Area: Admin Office','Location: Back Office')
for($i=0;$i -lt 4;$i++){ $fx=$ui.ContentX+14+($i%2)*190; $fy=$ui.ContentY+88+[math]::Floor($i/2)*43; Add-Box $s $fx $fy 176 30 0xF4F4F5 5 $C.Line | Out-Null; Add-Text $s $filters[$i] ($fx+9) ($fy+9) 158 12 8 $C.Ink $true | Out-Null }
Add-Text $s 'Select a result to review details, access assignment, storage route, files, and activity.' $ui.ContentX ($ui.ContentY+214) $ui.ContentW 32 10 $C.Crimson $true | Out-Null

# 14 - Evidence and revisions
$s=New-Slide 14 'DOCUMENT CONTROL'; Add-Title $s 'Supporting evidence and revisions' 'Attach context without losing history' 'Evidence explains the record; revisions control the main working file.'
Add-Card $s 54 155 405 245 'Supporting evidence' 'Use for scanned pages, photos, receipts, references, or supporting Office/PDF files.`n`nHardcopy records may have evidence even though the original remains physical.' $C.Green 'ATTACHMENTS'
Add-Card $s 499 155 405 245 'Controlled revisions' 'Use for successive versions of the principal softcopy document.`n`nAlways provide a meaningful reason so reviewers understand what changed.' $C.Red 'VERSION HISTORY'
Add-Text $s 'Evidence answers: what supports this record?' 84 438 375 18 11 $C.Green $true 'Aptos' 2 | Out-Null
Add-Text $s 'Revisions answer: which version is current, and why?' 499 438 405 18 11 $C.Crimson $true 'Aptos' 2 | Out-Null

# 15 - Disposal
$s=New-Slide 15 'RECORD LIFECYCLE'; Add-Title $s 'Document disposal' 'A controlled decision - not a silent delete' 'Disposal preserves accountability and supports restoration when policy permits.'
$steps=@(@('Request','Authorized user submits a disposal request and reason.'),@('Review','Reviewer evaluates the request and record context.'),@('Decision','Approve or reject; the decision is recorded.'),@('Disposed','Record appears in Document Disposal with remarks and date.'),@('Restore','Authorized personnel can restore a disposed record when justified.'))
for($i=0;$i -lt 5;$i++){Add-Step $s ($i+1) $steps[$i][0] $steps[$i][1] (35+$i*185) 180 170 ($(if($i -eq 3){$C.Crimson}else{$C.Red}))}
Add-Text $s 'Deletion and disposal are different: disposal is a visible lifecycle state; deletion removes a record and requires separate authority.' 80 360 800 48 13 $C.Ink $true 'Aptos' 2 | Out-Null

# 16 - Notifications and audit
$s=New-Slide 16 'ACCOUNTABILITY'; Add-Title $s 'Notifications and audit logs' 'Awareness for users, evidence for administrators' 'Two related tools answer different questions.'
Add-Card $s 54 155 405 238 'Notification center' 'Answers: What needs my attention?`n`n- New assignments`n- Request decisions`n- Workflow updates`n- Unread counter and direct navigation' $C.Red 'ACTIONABLE'
Add-Card $s 499 155 405 238 'Audit and Activity Logs' 'Answers: Who did what and when?`n`n- Authenticated user and role`n- Action and module`n- Affected record context`n- Time and client computer IP' $C.Ink 'TRACEABLE'
Add-Box $s 150 430 660 48 0xF2F2FE 5 0xFECACA | Out-Null
Add-Text $s 'Sensitive passwords, tokens, authorization headers, and file contents are excluded from audit metadata.' 174 445 612 18 11 $C.Crimson $true 'Aptos' 2 | Out-Null

# 17 - Administration
$s=New-Slide 17 'ADMINISTRATION'; Add-Title $s 'System administration' 'Configure the structure before users create records' 'Good catalogs and permissions make daily document entry consistent.'
$admin=@(@('Storage & Classification','Areas, specifics, locations, assets, sequences, and softcopy folders.'),@('User Accounts','Profiles, roles, active status, registration review, and account governance.'),@('Roles & Permissions','Module and action rights based on job responsibilities.'),@('System Settings','Branding, presentation, document behavior, and protected integration status.'))
for($i=0;$i -lt 4;$i++){ $x=54+($i%2)*425; $y=155+[math]::Floor($i/2)*145; Add-Card $s $x $y 395 120 $admin[$i][0] $admin[$i][1] ($(if($i%2 -eq 0){$C.Red}else{$C.Ink})) ('0'+($i+1)) }
Add-Text $s 'Recommended order: define storage -> define roles -> create users -> assign documents -> begin operations.' 80 465 800 20 12 $C.Crimson $true 'Aptos' 2 | Out-Null

# 18 - Backup
$s=New-Slide 18 'RESILIENCE'; Add-Title $s 'Backup, restore, and reset' 'Protect information before it is needed' 'Administrative recovery actions are guarded and separated from normal document work.'
Add-Card $s 54 155 258 245 'Backup' 'Create a database snapshot and preserve uploaded document storage according to the configured process. Record the purpose and date.' $C.Green 'SAFE COPY'
Add-Card $s 350 155 258 245 'Restore' 'Choose the correct backup, understand the impact, confirm authorization, and verify the system after recovery.' $C.Amber 'RECOVERY'
Add-Card $s 646 155 258 245 'Start over' 'Use only for an approved full reset. A safety copy is made first. This action is not part of normal daily use.' $C.Red 'HIGH IMPACT'
Add-Text $s 'Operational rule: test the backup file, the application health, and a representative document - not only the backup count.' 85 440 790 36 12 $C.Ink $true 'Aptos' 2 | Out-Null

# 19 - Day in the life
$s=New-Slide 19 'PRACTICAL TUTORIAL'; Add-Title $s 'A complete day-in-the-life example' 'From incoming document to accountable retrieval' 'Use this slide as the guided demonstration during the presentation.'
$demo=@('Admin prepares the storage catalogs and user roles.','Staff registers a trademark application as hardcopy.','Staff maps ADMIN OFFICE -> BACK OFFICE STORAGE -> DU.','Admin assigns access to the responsible auditor.','Auditor finds the record and reviews attached scans.','A later disposal request moves through approval and audit.')
for($i=0;$i -lt 6;$i++){ $x=54+($i%3)*286; $y=150+[math]::Floor($i/3)*145; Add-Box $s $x $y 260 118 $C.White 5 $C.Line | Out-Null; Add-Text $s ([string]($i+1)) ($x+16) ($y+17) 32 26 20 $C.Red $true | Out-Null; Add-Text $s $demo[$i] ($x+58) ($y+19) 180 68 11 $C.Ink $true | Out-Null }
Add-Pill $s 'DEMO COMPLETE' 390 452 180 $C.Red $C.White

# 20 - Close
$s=New-Slide 20 'CLOSING'; Add-Title $s 'Presentation close' 'Controlled documents. Clear responsibility. Defensible history.' 'End with the system value, then proceed to the live demonstration or questions.'
Add-Card $s 54 160 258 190 'Find it' 'Searchable digital records and precise physical storage routes reduce retrieval time.' $C.Red 'SPEED'
Add-Card $s 350 160 258 190 'Protect it' 'Roles, permissions, assignments, blank credentials, and controlled sessions limit exposure.' $C.Ink 'SECURITY'
Add-Card $s 646 160 258 190 'Prove it' 'Requests, approvals, revisions, disposal history, notifications, and audit logs provide accountability.' $C.Green 'TRUST'
Add-Text $s 'Questions & live demonstration' 54 408 850 40 24 $C.Crimson $true 'Aptos' 2 | Out-Null
Add-Text $s 'Suggested demo: login -> dashboard -> create/find document -> assign user -> open details -> audit activity.' 140 463 680 24 11 $C.Gray $false 'Aptos' 2 | Out-Null

$resolved=[System.IO.Path]::GetFullPath($OutputPath)
foreach($slide in $deck.Slides) {
    try { $slide.SlideShowTransition.EntryEffect = 3849; $slide.SlideShowTransition.Speed = 2 } catch {}
    $limit=[Math]::Min($slide.Shapes.Count,8)
    for($i=1;$i -le $limit;$i++) {
        try { [void]$slide.TimeLine.MainSequence.AddEffect($slide.Shapes.Item($i),10,0,3) } catch {}
    }
}
$deck.SaveAs($resolved,24)
$slideCount=$deck.Slides.Count
$deck.Close(); $ppt.Quit()
[void][Runtime.InteropServices.Marshal]::ReleaseComObject($deck)
[void][Runtime.InteropServices.Marshal]::ReleaseComObject($ppt)
Write-Output "Created $resolved with $slideCount slides."
