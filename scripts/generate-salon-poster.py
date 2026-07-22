from pathlib import Path

import qrcode
from PIL import Image, ImageDraw, ImageEnhance, ImageFont
from qrcode.constants import ERROR_CORRECT_Q


ROOT = Path(__file__).resolve().parents[1]
ASSETS = ROOT / "public/falcon-expo-assets"
WIDTH, HEIGHT = 1080, 1920
REGISTRATION_URL = "https://falcon-expo.onrender.com/salon.html"
FONT_PATH = "/System/Library/Fonts/PingFang.ttc"

FALCON_SOURCE = ASSETS / "hero-falcon.jpg"
# Unsplash source: https://unsplash.com/photos/1470337458703-46ad1756a187
MOUTAI_SOURCE = ASSETS / "poster-moutai-background.png"
# Unsplash source: https://unsplash.com/photos/1605499907240-d4240d766581
SEA_FISHING_SOURCE = ASSETS / "poster-sea-fishing-background.png"

QR_OUTPUT = ASSETS / "salon-registration-qr.png"
REGISTRATION_OUTPUT = ASSETS / "oriental-falcon-salon-poster.png"
MOUTAI_OUTPUT = ASSETS / "salon-moutai-theme-poster.png"
SEA_FISHING_OUTPUT = ASSETS / "salon-sea-fishing-theme-poster.png"
GLOBAL_OUTPUT = ASSETS / "salon-global-theme-poster.png"

COPPER = (226, 181, 116)
GOLD = (244, 205, 128)
VERMILION = (190, 58, 45)
SEA_BLUE = (145, 207, 220)
WHITE = (255, 253, 250)
MUTED_WHITE = (228, 222, 214)


def font(size, index=0):
    return ImageFont.truetype(FONT_PATH, size=size, index=index)


def wrap_text(draw, text, text_font, max_width):
    lines = []
    current = ""
    for character in text:
        candidate = current + character
        width = draw.textbbox((0, 0), candidate, font=text_font)[2]
        if current and width > max_width:
            lines.append(current)
            current = character
        else:
            current = candidate
    if current:
        lines.append(current)
    return lines


def draw_wrapped(
    draw,
    position,
    text,
    text_font,
    fill,
    max_width,
    line_gap,
    stroke_width=0,
    stroke_fill=None,
):
    x, y = position
    line_height = draw.textbbox((0, 0), "国A", font=text_font)[3]
    for line in wrap_text(draw, text, text_font, max_width):
        draw.text(
            (x, y),
            line,
            font=text_font,
            fill=fill,
            stroke_width=stroke_width,
            stroke_fill=stroke_fill,
        )
        y += line_height + line_gap
    return y


def cover_crop(image, target_size, focus_x=0.5, focus_y=0.5, zoom=1.0):
    target_width, target_height = target_size
    scale = max(target_width / image.width, target_height / image.height) * zoom
    resized = image.resize(
        (round(image.width * scale), round(image.height * scale)),
        Image.Resampling.LANCZOS,
    )
    max_left = max(0, resized.width - target_width)
    max_top = max(0, resized.height - target_height)
    left = round(max_left * focus_x)
    top = round(max_top * focus_y)
    return resized.crop((left, top, left + target_width, top + target_height))


def prepare_background(
    source_path,
    focus_x=0.5,
    focus_y=0.5,
    zoom=1.0,
    saturation=0.85,
    brightness=0.66,
):
    source = Image.open(source_path).convert("RGB")
    background = cover_crop(
        source,
        (WIDTH, HEIGHT),
        focus_x=focus_x,
        focus_y=focus_y,
        zoom=zoom,
    )
    background = ImageEnhance.Color(background).enhance(saturation)
    background = ImageEnhance.Brightness(background).enhance(brightness)
    return background.convert("RGBA")


def add_readability_shade(poster, top_alpha=175, bottom_alpha=190):
    overlay = Image.new("RGBA", poster.size, (0, 0, 0, 0))
    draw = ImageDraw.Draw(overlay, "RGBA")
    for y in range(0, 780, 8):
        alpha = round(top_alpha * (1 - y / 780))
        draw.rectangle((0, y, WIDTH, y + 8), fill=(8, 8, 8, alpha))
    for y in range(1120, HEIGHT, 8):
        alpha = round(bottom_alpha * ((y - 1120) / (HEIGHT - 1120)))
        draw.rectangle((0, y, WIDTH, y + 8), fill=(8, 8, 8, alpha))
    poster.alpha_composite(overlay)


def make_qr():
    qr = qrcode.QRCode(
        version=None,
        error_correction=ERROR_CORRECT_Q,
        box_size=10,
        border=4,
    )
    qr.add_data(REGISTRATION_URL)
    qr.make(fit=True)
    image = qr.make_image(fill_color="black", back_color="white").convert("RGB")
    ASSETS.mkdir(parents=True, exist_ok=True)
    image.save(QR_OUTPUT, format="PNG", optimize=True)
    return image


def draw_flow_node(draw, x, y, number, label, width):
    shadow = (8, 7, 6, 220)
    draw.text(
        (x, y),
        number,
        font=font(24),
        fill=COPPER,
        stroke_width=2,
        stroke_fill=shadow,
    )
    draw.text(
        (x, y + 39),
        label,
        font=font(35),
        fill=WHITE,
        stroke_width=2,
        stroke_fill=shadow,
    )
    draw.rectangle((x, y + 94, x + width, y + 97), fill=(*COPPER, 155))


def make_registration_poster(qr_image):
    poster = prepare_background(
        FALCON_SOURCE,
        focus_x=0.64,
        focus_y=0.75,
        zoom=1.25,
        saturation=0.78,
        brightness=0.52,
    )
    poster.alpha_composite(Image.new("RGBA", poster.size, (12, 11, 10, 88)))
    draw = ImageDraw.Draw(poster, "RGBA")
    margin = 64
    shadow = (8, 7, 6, 220)

    draw.text((margin, 76), "高端商务沙龙  ·  成都", font=font(32), fill=COPPER)
    draw.text((margin, 148), "精品东方", font=font(104), fill=WHITE)
    draw.text((margin, 270), "鹰耀出海", font=font(104), fill=WHITE)
    draw.rectangle((margin, 398, 260, 404), fill=COPPER)

    intro_top = 486
    draw.text(
        (margin, intro_top),
        "活动主题",
        font=font(30),
        fill=COPPER,
        stroke_width=2,
        stroke_fill=shadow,
    )
    overview = (
        "围绕沙特猎鹰展推介、AI+文旅出海与东方精品文化交流，"
        "链接出海企业家、海外嘉宾、AI科技企业代表及高净值客户。"
    )
    intro_end = draw_wrapped(
        draw,
        (margin, intro_top + 64),
        overview,
        font(39),
        WHITE,
        WIDTH - 2 * margin,
        14,
        stroke_width=2,
        stroke_fill=shadow,
    )
    draw.text(
        (margin, intro_end + 20),
        "沙特猎鹰展推介  ·  AI+文旅出海",
        font=font(32),
        fill=COPPER,
        stroke_width=2,
        stroke_fill=shadow,
    )

    info_top = 940
    draw.text(
        (margin, info_top),
        "2026年8月7日",
        font=font(62),
        fill=COPPER,
        stroke_width=2,
        stroke_fill=shadow,
    )
    draw.text(
        (margin, info_top + 84),
        "15:00 主题活动   |   18:00 精品晚宴",
        font=font(39),
        fill=WHITE,
        stroke_width=2,
        stroke_fill=shadow,
    )
    draw.text(
        (margin, info_top + 150),
        "成都高新区豪生酒店",
        font=font(46),
        fill=WHITE,
        stroke_width=2,
        stroke_fill=shadow,
    )
    draw.text(
        (margin, info_top + 214),
        "成都市武侯区天泰路338号",
        font=font(34),
        fill=MUTED_WHITE,
        stroke_width=2,
        stroke_fill=shadow,
    )

    flow_top = 1298
    draw.text(
        (margin, flow_top),
        "现场流程",
        font=font(38),
        fill=COPPER,
        stroke_width=2,
        stroke_fill=shadow,
    )
    draw_flow_node(draw, margin, flow_top + 70, "01", "东方文化体验", 390)
    draw_flow_node(draw, 530, flow_top + 70, "02", "AI+文旅出海沙龙", 470)
    draw_flow_node(draw, margin, flow_top + 186, "03", "精品晚宴", 390)
    draw_flow_node(draw, 530, flow_top + 186, "04", "东方节目与互动", 470)

    draw.text(
        (margin, 1712),
        "席位有限",
        font=font(40),
        fill=WHITE,
        stroke_width=2,
        stroke_fill=shadow,
    )
    draw.text(
        (margin, 1768),
        "提交报名后联系确认",
        font=font(28),
        fill=MUTED_WHITE,
        stroke_width=2,
        stroke_fill=shadow,
    )

    qr_size = 220
    qr_for_poster = qr_image.resize((qr_size, qr_size), Image.Resampling.NEAREST)
    qr_x = WIDTH - margin - qr_size
    qr_y = 1625
    draw.text(
        (qr_x, qr_y - 42),
        "扫码报名",
        font=font(24),
        fill=WHITE,
        stroke_width=2,
        stroke_fill=shadow,
    )
    poster.alpha_composite(qr_for_poster.convert("RGBA"), (qr_x, qr_y))
    draw.text(
        (margin, 1854),
        "falcon-expo.onrender.com/salon.html",
        font=font(18),
        fill=MUTED_WHITE,
        stroke_width=1,
        stroke_fill=shadow,
    )

    poster.convert("RGB").save(REGISTRATION_OUTPUT, format="PNG", optimize=True)


def make_theme_poster(
    source_path,
    output_path,
    title_lines,
    description,
    accent,
    category,
    focus_x=0.5,
    focus_y=0.5,
    zoom=1.0,
    saturation=0.9,
    brightness=0.72,
):
    poster = prepare_background(
        source_path,
        focus_x=focus_x,
        focus_y=focus_y,
        zoom=zoom,
        saturation=saturation,
        brightness=brightness,
    )
    add_readability_shade(poster)
    draw = ImageDraw.Draw(poster, "RGBA")
    margin = 70
    shadow = (4, 5, 6, 210)

    draw.text(
        (margin, 82),
        f"精品东方 · 鹰耀出海  /  {category}",
        font=font(28),
        fill=accent,
        stroke_width=2,
        stroke_fill=shadow,
    )
    title_top = 186
    for index, line in enumerate(title_lines):
        draw.text(
            (margin, title_top + index * 126),
            line,
            font=font(96),
            fill=WHITE,
            stroke_width=3,
            stroke_fill=shadow,
        )
    line_y = title_top + len(title_lines) * 126 + 8
    draw.rectangle((margin, line_y, margin + 210, line_y + 6), fill=accent)
    draw.text(
        (margin, line_y + 46),
        description,
        font=font(37),
        fill=accent,
        stroke_width=2,
        stroke_fill=shadow,
    )

    footer_y = 1718
    draw.rectangle((margin, footer_y - 44, WIDTH - margin, footer_y - 41), fill=(*accent, 165))
    draw.text(
        (margin, footer_y),
        "2026.8.7  ·  成都",
        font=font(42),
        fill=WHITE,
        stroke_width=2,
        stroke_fill=shadow,
    )
    draw.text(
        (margin, footer_y + 66),
        "精品东方·鹰耀出海",
        font=font(29),
        fill=accent,
        stroke_width=2,
        stroke_fill=shadow,
    )
    draw.text(
        (WIDTH - margin, footer_y + 70),
        "高端商务沙龙",
        anchor="ra",
        font=font(25),
        fill=MUTED_WHITE,
        stroke_width=2,
        stroke_fill=shadow,
    )

    poster.convert("RGB").save(output_path, format="PNG", optimize=True)


def make_theme_posters():
    make_theme_poster(
        MOUTAI_SOURCE,
        MOUTAI_OUTPUT,
        ("精品东方", "醇香世界"),
        "精品茅台高端品鉴之夜",
        GOLD,
        "东方品鉴",
        focus_x=0.72,
        focus_y=0.5,
        brightness=0.68,
    )
    make_theme_poster(
        SEA_FISHING_SOURCE,
        SEA_FISHING_OUTPUT,
        ("向海而行", "钓见新境"),
        "海钓文化 · 户外生活 · 圈层社交",
        SEA_BLUE,
        "海钓主题",
        focus_x=0.48,
        focus_y=0.5,
        saturation=0.84,
        brightness=0.72,
    )
    make_theme_poster(
        FALCON_SOURCE,
        GLOBAL_OUTPUT,
        ("鹰耀中东", "链接全球"),
        "沙特猎鹰展推介 · AI+文旅出海",
        COPPER,
        "出海主题",
        focus_x=0.64,
        focus_y=0.75,
        zoom=1.22,
        saturation=0.78,
        brightness=0.58,
    )


if __name__ == "__main__":
    qr_image = make_qr()
    make_registration_poster(qr_image)
    make_theme_posters()
    for output in (
        QR_OUTPUT,
        REGISTRATION_OUTPUT,
        MOUTAI_OUTPUT,
        SEA_FISHING_OUTPUT,
        GLOBAL_OUTPUT,
    ):
        print(output)
