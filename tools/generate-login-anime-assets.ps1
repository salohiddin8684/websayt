$ErrorActionPreference = "Stop"

Add-Type -AssemblyName System.Drawing

function New-HexColor {
  param(
    [Parameter(Mandatory = $true)]
    [string]$Hex,
    [int]$Alpha = 255
  )

  $clean = $Hex.TrimStart("#")
  return [System.Drawing.Color]::FromArgb(
    $Alpha,
    [Convert]::ToInt32($clean.Substring(0, 2), 16),
    [Convert]::ToInt32($clean.Substring(2, 2), 16),
    [Convert]::ToInt32($clean.Substring(4, 2), 16)
  )
}

function Blend-Color {
  param(
    [Parameter(Mandatory = $true)]
    [System.Drawing.Color]$ColorA,
    [Parameter(Mandatory = $true)]
    [System.Drawing.Color]$ColorB,
    [double]$Ratio = 0.5,
    [int]$Alpha = 255
  )

  $r = [int][Math]::Round($ColorA.R + (($ColorB.R - $ColorA.R) * $Ratio))
  $g = [int][Math]::Round($ColorA.G + (($ColorB.G - $ColorA.G) * $Ratio))
  $b = [int][Math]::Round($ColorA.B + (($ColorB.B - $ColorA.B) * $Ratio))
  return [System.Drawing.Color]::FromArgb($Alpha, $r, $g, $b)
}

function New-Point {
  param(
    [double]$X,
    [double]$Y
  )

  return [System.Drawing.PointF]::new([float]$X, [float]$Y)
}

function Fill-Polygon {
  param(
    [Parameter(Mandatory = $true)]
    [System.Drawing.Graphics]$Graphics,
    [Parameter(Mandatory = $true)]
    [System.Drawing.Brush]$Brush,
    [Parameter(Mandatory = $true)]
    [System.Drawing.PointF[]]$Points
  )

  $Graphics.FillPolygon($Brush, $Points)
}

function Draw-HairBack {
  param(
    [System.Drawing.Graphics]$Graphics,
    [string]$Style,
    [System.Drawing.Brush]$HairBrush,
    [System.Drawing.Brush]$HairShadowBrush
  )

  switch ($Style) {
    "twin" {
      $Graphics.FillEllipse($HairShadowBrush, 140, 220, 620, 560)
      $Graphics.FillEllipse($HairShadowBrush, 70, 340, 170, 520)
      $Graphics.FillEllipse($HairShadowBrush, 660, 340, 170, 520)
    }
    "pony" {
      $Graphics.FillEllipse($HairShadowBrush, 160, 220, 600, 540)
      $Graphics.FillEllipse($HairShadowBrush, 620, 340, 180, 460)
    }
    "bob" {
      $Graphics.FillEllipse($HairShadowBrush, 165, 225, 590, 500)
    }
    "short" {
      $Graphics.FillEllipse($HairShadowBrush, 180, 230, 560, 450)
    }
    default {
      $Graphics.FillEllipse($HairShadowBrush, 150, 210, 600, 600)
    }
  }

  $Graphics.FillEllipse($HairBrush, 185, 185, 530, 410)
}

function Draw-HairFront {
  param(
    [System.Drawing.Graphics]$Graphics,
    [string]$Style,
    [System.Drawing.Brush]$HairBrush,
    [System.Drawing.Brush]$HairHighlightBrush
  )

  $Graphics.FillPie($HairBrush, 220, 135, 460, 310, 180, 180)

  Fill-Polygon $Graphics $HairBrush ([System.Drawing.PointF[]]@(
      (New-Point 250 245),
      (New-Point 360 470),
      (New-Point 430 250)
    ))

  Fill-Polygon $Graphics $HairBrush ([System.Drawing.PointF[]]@(
      (New-Point 410 245),
      (New-Point 505 470),
      (New-Point 580 255)
    ))

  Fill-Polygon $Graphics $HairBrush ([System.Drawing.PointF[]]@(
      (New-Point 330 220),
      (New-Point 450 455),
      (New-Point 530 220)
    ))

  switch ($Style) {
    "twin" {
      $Graphics.FillEllipse($HairBrush, 185, 320, 110, 250)
      $Graphics.FillEllipse($HairBrush, 605, 320, 110, 250)
    }
    "pony" {
      $Graphics.FillEllipse($HairBrush, 610, 305, 130, 280)
    }
    "bob" {
      $Graphics.FillEllipse($HairBrush, 205, 315, 110, 210)
      $Graphics.FillEllipse($HairBrush, 585, 315, 110, 210)
    }
    "short" {
      $Graphics.FillEllipse($HairBrush, 215, 330, 95, 160)
      $Graphics.FillEllipse($HairBrush, 590, 330, 95, 160)
    }
    default {
      $Graphics.FillEllipse($HairBrush, 190, 320, 118, 330)
      $Graphics.FillEllipse($HairBrush, 592, 320, 118, 330)
    }
  }

  $Graphics.FillEllipse($HairHighlightBrush, 255, 180, 110, 42)
}

function Draw-Face {
  param(
    [System.Drawing.Graphics]$Graphics,
    [System.Drawing.Brush]$SkinBrush,
    [System.Drawing.Brush]$SkinShadeBrush
  )

  $Graphics.FillEllipse($SkinBrush, 278, 242, 344, 404)
  $Graphics.FillEllipse($SkinBrush, 250, 388, 55, 88)
  $Graphics.FillEllipse($SkinBrush, 595, 388, 55, 88)
  $Graphics.FillEllipse($SkinShadeBrush, 334, 542, 232, 72)
}

function Draw-Eyes {
  param(
    [System.Drawing.Graphics]$Graphics,
    [System.Drawing.Color]$EyeColor
  )

  $whiteBrush = [System.Drawing.SolidBrush]::new([System.Drawing.Color]::White)
  $irisBrush = [System.Drawing.SolidBrush]::new($EyeColor)
  $pupilBrush = [System.Drawing.SolidBrush]::new([System.Drawing.Color]::FromArgb(255, 21, 26, 41))
  $shineBrush = [System.Drawing.SolidBrush]::new([System.Drawing.Color]::FromArgb(230, 255, 255, 255))
  $lashPen = [System.Drawing.Pen]::new([System.Drawing.Color]::FromArgb(255, 40, 26, 44), 7)
  $lashPen.StartCap = [System.Drawing.Drawing2D.LineCap]::Round
  $lashPen.EndCap = [System.Drawing.Drawing2D.LineCap]::Round
  $browPen = [System.Drawing.Pen]::new([System.Drawing.Color]::FromArgb(210, 68, 42, 62), 5)
  $browPen.StartCap = [System.Drawing.Drawing2D.LineCap]::Round
  $browPen.EndCap = [System.Drawing.Drawing2D.LineCap]::Round

  $Graphics.FillEllipse($whiteBrush, 330, 388, 110, 52)
  $Graphics.FillEllipse($whiteBrush, 460, 388, 110, 52)
  $Graphics.DrawArc($lashPen, 330, 372, 110, 70, 200, 140)
  $Graphics.DrawArc($lashPen, 460, 372, 110, 70, 200, 140)
  $Graphics.FillEllipse($irisBrush, 366, 393, 38, 52)
  $Graphics.FillEllipse($irisBrush, 496, 393, 38, 52)
  $Graphics.FillEllipse($pupilBrush, 377, 404, 16, 26)
  $Graphics.FillEllipse($pupilBrush, 507, 404, 16, 26)
  $Graphics.FillEllipse($shineBrush, 374, 400, 8, 8)
  $Graphics.FillEllipse($shineBrush, 504, 400, 8, 8)
  $Graphics.DrawArc($browPen, 334, 344, 98, 34, 198, 140)
  $Graphics.DrawArc($browPen, 466, 344, 98, 34, 202, 140)

  $whiteBrush.Dispose()
  $irisBrush.Dispose()
  $pupilBrush.Dispose()
  $shineBrush.Dispose()
  $lashPen.Dispose()
  $browPen.Dispose()
}

function Draw-FaceDetails {
  param(
    [System.Drawing.Graphics]$Graphics,
    [System.Drawing.Color]$AccentLight
  )

  $blushBrush = [System.Drawing.SolidBrush]::new([System.Drawing.Color]::FromArgb(42, 255, 117, 162))
  $mouthPen = [System.Drawing.Pen]::new([System.Drawing.Color]::FromArgb(150, 158, 87, 98), 4)
  $mouthPen.StartCap = [System.Drawing.Drawing2D.LineCap]::Round
  $mouthPen.EndCap = [System.Drawing.Drawing2D.LineCap]::Round
  $nosePen = [System.Drawing.Pen]::new([System.Drawing.Color]::FromArgb(90, 177, 118, 104), 4)
  $glowBrush = [System.Drawing.SolidBrush]::new([System.Drawing.Color]::FromArgb(28, $AccentLight))

  $Graphics.FillEllipse($blushBrush, 312, 468, 62, 24)
  $Graphics.FillEllipse($blushBrush, 528, 468, 62, 24)
  $Graphics.DrawLine($nosePen, 450, 455, 445, 480)
  $Graphics.DrawArc($mouthPen, 410, 505, 78, 34, 10, 160)
  $Graphics.FillEllipse($glowBrush, 332, 280, 120, 50)

  $blushBrush.Dispose()
  $mouthPen.Dispose()
  $nosePen.Dispose()
  $glowBrush.Dispose()
}

function Draw-Outfit {
  param(
    [System.Drawing.Graphics]$Graphics,
    [string]$Style,
    [System.Drawing.Brush]$OutfitBrush,
    [System.Drawing.Brush]$ShadeBrush,
    [System.Drawing.Brush]$TrimBrush,
    [System.Drawing.Brush]$AccentBrush,
    [System.Drawing.Color]$AccentColor
  )

  switch ($Style) {
    "hoodie" {
      $Graphics.FillEllipse($ShadeBrush, 245, 560, 410, 190)
      Fill-Polygon $Graphics $OutfitBrush ([System.Drawing.PointF[]]@(
          (New-Point 168 1150),
          (New-Point 732 1150),
          (New-Point 660 672),
          (New-Point 240 672)
        ))
      Fill-Polygon $Graphics $TrimBrush ([System.Drawing.PointF[]]@(
          (New-Point 285 620),
          (New-Point 450 790),
          (New-Point 620 620),
          (New-Point 555 580),
          (New-Point 450 692),
          (New-Point 345 580)
        ))
      $stringPen = [System.Drawing.Pen]::new($AccentColor, 7)
      $stringPen.StartCap = [System.Drawing.Drawing2D.LineCap]::Round
      $stringPen.EndCap = [System.Drawing.Drawing2D.LineCap]::Round
      $Graphics.DrawLine($stringPen, 425, 760, 405, 850)
      $Graphics.DrawLine($stringPen, 475, 760, 495, 850)
      $stringPen.Dispose()
    }
    "coat" {
      Fill-Polygon $Graphics $OutfitBrush ([System.Drawing.PointF[]]@(
          (New-Point 178 1150),
          (New-Point 722 1150),
          (New-Point 650 640),
          (New-Point 250 640)
        ))
      Fill-Polygon $Graphics $ShadeBrush ([System.Drawing.PointF[]]@(
          (New-Point 312 610),
          (New-Point 450 760),
          (New-Point 588 610),
          (New-Point 560 560),
          (New-Point 450 682),
          (New-Point 340 560)
        ))
      Fill-Polygon $Graphics $TrimBrush ([System.Drawing.PointF[]]@(
          (New-Point 394 760),
          (New-Point 506 760),
          (New-Point 522 1100),
          (New-Point 378 1100)
        ))
      $Graphics.FillRectangle($AccentBrush, 534, 840, 100, 38)
    }
    "kimono" {
      Fill-Polygon $Graphics $OutfitBrush ([System.Drawing.PointF[]]@(
          (New-Point 166 1150),
          (New-Point 734 1150),
          (New-Point 646 680),
          (New-Point 254 680)
        ))
      Fill-Polygon $Graphics $ShadeBrush ([System.Drawing.PointF[]]@(
          (New-Point 274 618),
          (New-Point 450 810),
          (New-Point 408 910),
          (New-Point 218 760)
        ))
      Fill-Polygon $Graphics $ShadeBrush ([System.Drawing.PointF[]]@(
          (New-Point 626 618),
          (New-Point 450 810),
          (New-Point 492 910),
          (New-Point 682 760)
        ))
      $Graphics.FillRectangle($AccentBrush, 238, 860, 424, 54)
      $trimPen = [System.Drawing.Pen]::new([System.Drawing.Color]::FromArgb(200, 255, 255, 255), 8)
      $trimPen.StartCap = [System.Drawing.Drawing2D.LineCap]::Round
      $trimPen.EndCap = [System.Drawing.Drawing2D.LineCap]::Round
      $Graphics.DrawLine($trimPen, 278, 620, 448, 810)
      $Graphics.DrawLine($trimPen, 622, 620, 452, 810)
      $trimPen.Dispose()
    }
    "idol" {
      Fill-Polygon $Graphics $OutfitBrush ([System.Drawing.PointF[]]@(
          (New-Point 170 1150),
          (New-Point 730 1150),
          (New-Point 662 710),
          (New-Point 560 630),
          (New-Point 340 630),
          (New-Point 238 710)
        ))
      Fill-Polygon $Graphics $TrimBrush ([System.Drawing.PointF[]]@(
          (New-Point 268 660),
          (New-Point 632 660),
          (New-Point 560 760),
          (New-Point 340 760)
        ))
      $Graphics.FillEllipse($AccentBrush, 324, 748, 252, 76)
      $Graphics.FillEllipse($ShadeBrush, 238, 882, 414, 164)
    }
    default {
      Fill-Polygon $Graphics $OutfitBrush ([System.Drawing.PointF[]]@(
          (New-Point 178 1150),
          (New-Point 722 1150),
          (New-Point 662 694),
          (New-Point 238 694)
        ))
      Fill-Polygon $Graphics $TrimBrush ([System.Drawing.PointF[]]@(
          (New-Point 280 620),
          (New-Point 450 788),
          (New-Point 620 620),
          (New-Point 566 590),
          (New-Point 450 706),
          (New-Point 334 590)
        ))
      Fill-Polygon $Graphics $AccentBrush ([System.Drawing.PointF[]]@(
          (New-Point 418 742),
          (New-Point 482 742),
          (New-Point 470 1054),
          (New-Point 430 1054)
        ))
    }
  }
}

function Draw-Accessory {
  param(
    [System.Drawing.Graphics]$Graphics,
    [string]$Type,
    [System.Drawing.Brush]$AccentBrush,
    [System.Drawing.Brush]$AccentLightBrush,
    [System.Drawing.Color]$AccentColor
  )

  switch ($Type) {
    "ribbon" {
      $Graphics.FillEllipse($AccentLightBrush, 236, 216, 56, 34)
      $Graphics.FillEllipse($AccentLightBrush, 282, 216, 56, 34)
      $Graphics.FillEllipse($AccentBrush, 275, 222, 20, 20)
    }
    "headphones" {
      $bandPen = [System.Drawing.Pen]::new($AccentColor, 14)
      $bandPen.StartCap = [System.Drawing.Drawing2D.LineCap]::Round
      $bandPen.EndCap = [System.Drawing.Drawing2D.LineCap]::Round
      $Graphics.DrawArc($bandPen, 286, 172, 330, 245, 190, 160)
      $Graphics.FillRectangle($AccentLightBrush, 238, 338, 34, 92)
      $Graphics.FillRectangle($AccentLightBrush, 628, 338, 34, 92)
      $bandPen.Dispose()
    }
    "flower" {
      $Graphics.FillEllipse($AccentLightBrush, 246, 208, 26, 26)
      $Graphics.FillEllipse($AccentLightBrush, 266, 188, 26, 26)
      $Graphics.FillEllipse($AccentLightBrush, 286, 208, 26, 26)
      $Graphics.FillEllipse($AccentLightBrush, 266, 228, 26, 26)
      $Graphics.FillEllipse($AccentBrush, 268, 208, 22, 22)
    }
    "halo" {
      $haloPen = [System.Drawing.Pen]::new($AccentColor, 10)
      $Graphics.DrawEllipse($haloPen, 336, 134, 228, 30)
      $haloPen.Dispose()
    }
    "cat" {
      Fill-Polygon $Graphics $AccentLightBrush ([System.Drawing.PointF[]]@(
          (New-Point 274 202),
          (New-Point 320 138),
          (New-Point 348 214)
        ))
      Fill-Polygon $Graphics $AccentLightBrush ([System.Drawing.PointF[]]@(
          (New-Point 552 202),
          (New-Point 505 138),
          (New-Point 478 214)
        ))
    }
    default {
      Fill-Polygon $Graphics $AccentLightBrush ([System.Drawing.PointF[]]@(
          (New-Point 612 230),
          (New-Point 624 255),
          (New-Point 652 259),
          (New-Point 632 278),
          (New-Point 638 306),
          (New-Point 612 292),
          (New-Point 586 306),
          (New-Point 592 278),
          (New-Point 572 259),
          (New-Point 600 255)
        ))
    }
  }
}

$outputDir = Join-Path (Get-Location) "assets\\anime"
New-Item -ItemType Directory -Force -Path $outputDir | Out-Null

if (Test-Path (Join-Path $outputDir "test.png")) {
  Remove-Item -LiteralPath (Join-Path $outputDir "test.png") -Force
}

$hairColors = @(
  "#ff8ad7", "#61d6ff", "#b7a1ff", "#ffb0c7", "#ffd28a",
  "#7ae8ff", "#31d1c6", "#ffbde2", "#9aa8ff", "#ffc19e",
  "#d8b6ff", "#96ebff", "#897dff", "#ffd37f", "#e6f2ff",
  "#7ba8ff", "#8be679", "#f0abfc", "#ffe38c", "#daf4ff"
)

$accentColors = @(
  "#7c3aed", "#2563eb", "#8b5cf6", "#f43f5e", "#f59e0b",
  "#0ea5e9", "#14b8a6", "#ec4899", "#6366f1", "#fb7185",
  "#a855f7", "#06b6d4", "#8b5cf6", "#f97316", "#38bdf8",
  "#2563eb", "#22c55e", "#d946ef", "#f59e0b", "#0ea5e9"
)

$outfitColors = @(
  "#36215c", "#24395f", "#323a71", "#7a2f4f", "#8a4727",
  "#1d4a65", "#1d4346", "#6e2f7b", "#2c326a", "#864525",
  "#442d6d", "#205168", "#243659", "#8a3e25", "#5b7eb6",
  "#25426a", "#2a5338", "#68276d", "#6d3d20", "#3c6790"
)

$styles = @(
  "twin", "short", "long", "bob", "pony",
  "short", "long", "twin", "bob", "pony",
  "short", "long", "bob", "twin", "pony",
  "long", "short", "bob", "pony", "twin"
)

$accessories = @(
  "ribbon", "headphones", "halo", "flower", "star",
  "star", "cat", "star", "headphones", "ribbon",
  "halo", "flower", "star", "star", "flower",
  "headphones", "cat", "ribbon", "halo", "star"
)

$outfits = @(
  "uniform", "hoodie", "coat", "idol", "kimono",
  "coat", "hoodie", "idol", "uniform", "kimono",
  "coat", "uniform", "hoodie", "idol", "kimono",
  "coat", "hoodie", "uniform", "coat", "idol"
)

for ($index = 0; $index -lt 20; $index++) {
  $bitmap = [System.Drawing.Bitmap]::new(900, 1200, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
  $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
  $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
  $graphics.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality
  $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
  $graphics.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
  $graphics.Clear([System.Drawing.Color]::Transparent)

  $hairColor = New-HexColor $hairColors[$index]
  $hairShadowColor = Blend-Color $hairColor ([System.Drawing.Color]::Black) 0.35
  $accentColor = New-HexColor $accentColors[$index]
  $accentLightColor = Blend-Color $accentColor ([System.Drawing.Color]::White) 0.42
  $outfitColor = New-HexColor $outfitColors[$index]
  $outfitShadeColor = Blend-Color $outfitColor ([System.Drawing.Color]::Black) 0.4
  $skinColor = New-HexColor "#f4cfbb"
  $skinShadeColor = Blend-Color $skinColor ([System.Drawing.Color]::FromArgb(255, 210, 144, 118)) 0.5
  $eyeColor = Blend-Color $accentColor ([System.Drawing.Color]::White) 0.55

  $hairBrush = [System.Drawing.SolidBrush]::new($hairColor)
  $hairShadowBrush = [System.Drawing.SolidBrush]::new($hairShadowColor)
  $hairHighlightBrush = [System.Drawing.SolidBrush]::new([System.Drawing.Color]::FromArgb(44, 255, 255, 255))
  $accentBrush = [System.Drawing.SolidBrush]::new($accentColor)
  $accentLightBrush = [System.Drawing.SolidBrush]::new($accentLightColor)
  $accentGlowBrush = [System.Drawing.SolidBrush]::new([System.Drawing.Color]::FromArgb(48, $accentLightColor))
  $outfitBrush = [System.Drawing.SolidBrush]::new($outfitColor)
  $outfitShadeBrush = [System.Drawing.SolidBrush]::new($outfitShadeColor)
  $trimBrush = [System.Drawing.SolidBrush]::new([System.Drawing.Color]::FromArgb(240, 248, 244, 255))
  $skinBrush = [System.Drawing.SolidBrush]::new($skinColor)
  $skinShadeBrush = [System.Drawing.SolidBrush]::new($skinShadeColor)
  $shadowBrush = [System.Drawing.SolidBrush]::new([System.Drawing.Color]::FromArgb(34, 10, 6, 20))

  $graphics.FillEllipse($accentGlowBrush, 114, 108, 672, 672)
  $graphics.FillEllipse($accentLightBrush, 190, 198, 112, 112)
  $graphics.FillEllipse($accentLightBrush, 616, 268, 84, 84)
  $graphics.FillEllipse($accentLightBrush, 228, 810, 76, 76)
  $graphics.FillEllipse($shadowBrush, 210, 1090, 480, 44)

  Draw-HairBack $graphics $styles[$index] $hairBrush $hairShadowBrush
  Draw-Outfit $graphics $outfits[$index] $outfitBrush $outfitShadeBrush $trimBrush $accentBrush $accentColor

  $graphics.FillEllipse($skinShadeBrush, 412, 594, 76, 112)
  Draw-Face $graphics $skinBrush $skinShadeBrush
  Draw-Eyes $graphics $eyeColor
  Draw-FaceDetails $graphics $accentLightColor
  Draw-HairFront $graphics $styles[$index] $hairBrush $hairHighlightBrush
  Draw-Accessory $graphics $accessories[$index] $accentBrush $accentLightBrush $accentColor

  $outlinePen = [System.Drawing.Pen]::new([System.Drawing.Color]::FromArgb(76, 34, 18, 42), 4)
  $graphics.DrawEllipse($outlinePen, 278, 242, 344, 404)
  $outlinePen.Dispose()

  $filePath = Join-Path $outputDir ("{0}.png" -f ($index + 1))
  if (Test-Path $filePath) {
    Remove-Item -LiteralPath $filePath -Force
  }

  $bitmap.Save($filePath, [System.Drawing.Imaging.ImageFormat]::Png)

  $shadowBrush.Dispose()
  $skinShadeBrush.Dispose()
  $skinBrush.Dispose()
  $trimBrush.Dispose()
  $outfitShadeBrush.Dispose()
  $outfitBrush.Dispose()
  $accentGlowBrush.Dispose()
  $accentLightBrush.Dispose()
  $accentBrush.Dispose()
  $hairHighlightBrush.Dispose()
  $hairShadowBrush.Dispose()
  $hairBrush.Dispose()
  $graphics.Dispose()
  $bitmap.Dispose()
}

Get-ChildItem -Path $outputDir -Filter "*.png" |
  Sort-Object Name |
  Select-Object Name, Length
