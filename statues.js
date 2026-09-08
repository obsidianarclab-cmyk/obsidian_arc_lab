const products = {
  ganesha: {
    name: "Mini Ganesha",
    desc: "A detailed Mini Ganesha statue that brings peace and positivity to prayer spaces and refined spiritual décor. A thoughtful and meaningful gift.",
    colours: {
      White: {
        size: "5 cm height",
        material: "White PLA",
        weight: "Lightweight and durable",
        images: [
          { label: "White", src: "mini-ganesha-white.png" },
          { label: "Product details", src: "mini-ganesha-details.jpg" }
        ]
      },
      Black: {
        size: "5 cm height",
        material: "Black PLA",
        weight: "Lightweight and durable",
        images: [
          { label: "Black", src: "mini-ganesha-black.png" },
          { label: "Product details", src: "mini-ganesha-details.jpg" }
        ]
      },
      Gold: {
        size: "5 cm height",
        material: "Gold Silk PLA",
        weight: "Lightweight and durable",
        images: [
          { label: "Gold", src: "mini-ganesha-gold.png" },
          { label: "Product details", src: "mini-ganesha-details.jpg" }
        ]
      }
    }
  },
  anjaneya: {
    name: "Mini Hanuman",
    desc: "A detailed, finely finished Hanuman statue that brings peace, harmony and spiritual connection into your space. Lightweight, durable and ideal for home, office, shrine or meaningful gifting.",
    colours: {
      "Silky White / Matte White": {
        size: "Small: 5, 7 or 8 cm · Medium: 10, 12 or 13 cm · Large: 15, 17 or 19 cm",
        material: "Premium eco-friendly, non-toxic PLA",
        weight: "Lightweight and durable",
        images: [
          { label: "Product details", src: "mini-hanuman-main.jpg" },
          { label: "Front", src: "anjaneya-front.jpg" },
          { label: "Side", src: "anjaneya-side.jpg" },
          { label: "Back", src: "anjaneya-back.jpg" },
          { label: "Display", src: "anjaneya-lamp-display.jpg" },
          { label: "Size guide", src: "anjaneya-size-guide.jpg" }
        ]
      }
    }
  },
  buddha: {
    name: "Mini Buddha",
    desc: "A peaceful Buddha statue for meditation spaces, home décor and thoughtful gifting.",
    colours: {
      "Gold + White": {
        size: "Small: 5 × 7 × 8 cm · Medium: 10 × 12 × 13 cm · Large: 15 × 17 × 19 cm",
        material: "Gold and White PLA",
        weight: "Varies by selected size",
        images: [
          { label: "Front", src: "buddha-gold-white-front.jpg" },
          { label: "Lifestyle", src: "buddha-gold-white-lifestyle.jpg" },
          { label: "Back", src: "buddha-white-back.jpg" },
          { label: "Size guide", src: "buddha-size-guide.jpg" }
        ]
      },
      White: {
        size: "Small: 5 × 7 × 8 cm · Medium: 10 × 12 × 13 cm · Large: 15 × 17 × 19 cm",
        material: "White PLA",
        weight: "Varies by selected size",
        images: [
          { label: "Front", src: "buddha-white-front.jpg" },
          { label: "Back", src: "buddha-white-back.jpg" },
          { label: "Size guide", src: "buddha-size-guide.jpg" }
        ]
      }
    }
  }
};

let currentProduct = null;
let currentFinish = null;

function openWithKeyboard(event, productKey) {
  if (event.key === "Enter" || event.key === " ") {
    event.preventDefault();
    openProduct(productKey);
  }
}

function openProduct(productKey) {
  currentProduct = products[productKey];
  if (!currentProduct) return;

  document.getElementById("productName").textContent = currentProduct.name;
  document.getElementById("productDesc").textContent = currentProduct.desc;

  const finishes = Object.keys(currentProduct.colours);
  const select = document.getElementById("colourSelect");
  select.innerHTML = finishes.map(finish => `<option value="${finish}">${finish}</option>`).join("");
  currentFinish = finishes[0];
  updateProductDetails();

  document.getElementById("productModal").classList.add("is-open");
  document.body.style.overflow = "hidden";
  document.querySelector(".statue-modal__close").focus();
}

function changeColour() {
  currentFinish = document.getElementById("colourSelect").value;
  updateProductDetails();
}

function updateProductDetails() {
  const data = currentProduct?.colours[currentFinish];
  if (!data) return;

  document.getElementById("productSize").textContent = data.size;
  document.getElementById("productMaterial").textContent = data.material;
  document.getElementById("productWeight").textContent = data.weight;

  const row = document.getElementById("angleRow");
  row.innerHTML = data.images.map((image, index) => `
    <button type="button" class="${index === 0 ? "is-active" : ""}" onclick="changeAngle(${index})" aria-label="Show ${image.label} view">
      <img src="${image.src}" ${image.fallback ? `onerror="this.onerror=null;this.src='${image.fallback}';this.closest('button').classList.add('is-placeholder')"` : ""} alt="${currentProduct.name} ${image.label.toLowerCase()} view">
    </button>
  `).join("");

  changeAngle(0);
}

function changeAngle(index) {
  const data = currentProduct?.colours[currentFinish];
  const image = data?.images[index];
  if (!image) return;

  const mainImage = document.getElementById("mainImg");
  mainImage.onerror = image.fallback ? () => {
    mainImage.onerror = null;
    mainImage.src = image.fallback;
    document.getElementById("viewLabel").textContent = `${image.label.toUpperCase()} VIEW · PHOTO COMING SOON`;
  } : null;
  mainImage.src = image.src;
  mainImage.alt = `${currentProduct.name} ${image.label.toLowerCase()} view`;
  document.getElementById("viewLabel").textContent = `${image.label.toUpperCase()} VIEW`;

  document.querySelectorAll("#angleRow button").forEach((button, buttonIndex) => {
    button.classList.toggle("is-active", buttonIndex === index);
  });
}

function closeProduct() {
  document.getElementById("productModal").classList.remove("is-open");
  document.body.style.overflow = "";
}

function closeOnBackdrop(event) {
  if (event.target.id === "productModal") closeProduct();
}

function askWhatsapp() {
  if (!currentProduct || !currentFinish) return;
  const message = `Hello Obsidian Arc Lab, I would like to enquire about ${currentProduct.name} in ${currentFinish}. Please share the price and customisation details.`;
  openWhatsAppChoice(message);
}

document.addEventListener("keydown", event => {
  if (event.key === "Escape") closeProduct();
});
