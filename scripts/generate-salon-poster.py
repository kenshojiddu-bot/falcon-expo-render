from pathlib import Path

import qrcode
from PIL import Image, ImageDraw, ImageEnhance, ImageFont
from qrcode.constants import ERROR_CORRECT_Q


ROOT = Path(__file__).resolve().parents[1]
WIDTH, HEIGHT = 1080, 1920
REGISTRATION_URL = "https://falcon-expo.onrender.com/salon.html"
SOURCE_IMAGE = ROOT / "public/falcon-expo-assets/hero-falcon.jpg"
QR_OUTPUT = ROOT / "public/falcon-expo-assets/salon-registration-qr.png"
POSTER_OUTPUT = ROOT / "public/falcon-expo-assets/oriental-falcon-salon-poster.png"
FONT_PATH = "/System/Library/Fonts/PingFang.ttc"

CHARCOAL = (23, 22, 21)
COPPER = (226, 181, 116)
VERMILION = (183, 58, 47)
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


def cover_crop(image, target_size, focus_x=0.64, focus_y=0.75, zoom=1.25):
    target_width, target_height = target_size
    scale = max(target_width / image.width, target_height / image.height) * zoom
    resized = image.resize(
        (round(image.width * scale), round(image.height * scale)),
        Image.Resampling.LANCZOS,
    )
    max_left = max(0, resized.width - target_width)
    left = round(max_left * focus_x)
    max_top = max(0, resized.height - target_height)
    top = round(max_top * focus_y)
    return resized.crop((left, top, left + target_width, top + target_height))


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
    QR_OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    image.save(QR_OUTPUT, format="PNG", optimize=True)
    return image


def make_poster(qr_image):
    source = Image.open(SOURCE_IMAGE).convert("RGB")
    background = cover_crop(source, (WIDTH, HEIGHT))
    background = ImageEnhance.Color(background).enhance(0.78)
    background = ImageEnhance.Brightness(background).enhance(0.52)

    poster = background.convert("RGBA")
    poster.alpha_composite(Image.new("RGBA", poster.size, (12, 11, 10, 88)))
    draw = ImageDraw.Draw(poster, "RGBA")

    margin = 64
    draw.text((margin, 76), "高端商务沙龙  ·  成都", font=font(30), fill=COPPER)
    draw.text((margin, 148), "精品东方", font=font(96), fill=WHITE)
    draw.text((margin, 258), "鹰耀出海", font=font(96), fill=WHITE)
    draw.rectangle((margin, 398, 260, 404), fill=COPPER)

    intro_top = 468
    shadow = (8, 7, 6, 210)
    draw.text(
        (margin, intro_top),
        "活动主题",
        font=font(30),
        fill=COPPER,
        stroke_width=2,
        stroke_fill=shadow,
    )
    overview = (
        "活动以“精品东方·鹰耀出海”为主题，围绕沙特猎鹰展推介、"
        "AI+文旅出海与东方精品文化交流展开，链接出海企业家、海外嘉宾、"
        "AI科技企业代表及高净值客户。"
    )
    intro_end = draw_wrapped(
        draw,
        (margin, intro_top + 66),
        overview,
        font(34),
        WHITE,
        WIDTH - 2 * margin,
        14,
        stroke_width=2,
        stroke_fill=shadow,
    )
    draw.text(
        (margin, intro_end + 20),
        "沙特猎鹰展推介  ·  AI+文旅出海",
        font=font(29),
        fill=COPPER,
        stroke_width=2,
        stroke_fill=shadow,
    )

    info_top = 960
    draw.text(
        (margin, info_top),
        "2026年8月7日",
        font=font(52),
        fill=COPPER,
        stroke_width=2,
        stroke_fill=shadow,
    )
    draw.text(
        (margin, info_top + 76),
        "15:00 主题活动   |   18:00 精品晚宴",
        font=font(33),
        fill=WHITE,
        stroke_width=2,
        stroke_fill=shadow,
    )
    draw.text(
        (margin, info_top + 142),
        "成都高新区豪生酒店",
        font=font(39),
        fill=WHITE,
        stroke_width=2,
        stroke_fill=shadow,
    )
    draw.text(
        (margin, info_top + 202),
        "成都市武侯区天泰路338号",
        font=font(29),
        fill=MUTED_WHITE,
        stroke_width=2,
        stroke_fill=shadow,
    )

    draw.text(
        (margin, 1716),
        "席位有限  ·  提交后联系确认",
        font=font(27),
        fill=WHITE,
        stroke_width=2,
        stroke_fill=shadow,
    )

    qr_size = 240
    qr_for_poster = qr_image.resize((qr_size, qr_size), Image.Resampling.NEAREST)
    qr_x = WIDTH - margin - qr_size
    qr_y = 1594
    draw.text(
        (qr_x, qr_y - 48),
        "扫码报名",
        font=font(25),
        fill=WHITE,
        stroke_width=2,
        stroke_fill=shadow,
    )
    poster.alpha_composite(qr_for_poster.convert("RGBA"), (qr_x, qr_y))
    draw.text(
        (WIDTH - margin - 390, 1840),
        "falcon-expo.onrender.com/salon.html",
        font=font(18),
        fill=MUTED_WHITE,
        stroke_width=1,
        stroke_fill=shadow,
    )

    poster.convert("RGB").save(POSTER_OUTPUT, format="PNG", optimize=True)


if __name__ == "__main__":
    qr_image = make_qr()
    make_poster(qr_image)
    print(QR_OUTPUT)
    print(POSTER_OUTPUT)
