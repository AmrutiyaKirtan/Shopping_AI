import datetime

class MemoryAssistant:
    def __init__(self):
        self.occasion_history = {}  # {occasion: [(date, items)]}

    def add_purchase(self, occasion, date, items):
        if occasion not in self.occasion_history:
            self.occasion_history[occasion] = []
        self.occasion_history[occasion].append((date, items))

    def get_last_purchase(self, occasion):
        if occasion in self.occasion_history and self.occasion_history[occasion]:
            return self.occasion_history[occasion][-1]
        return None

    def remind_upcoming(self, occasion, upcoming_date):
        last = self.get_last_purchase(occasion)
        if last:
            last_date, items = last
            days_until = (upcoming_date - last_date).days
            if 0 < days_until <= 30:
                return f"Upcoming {occasion} in {days_until} days. Last time you bought: {items}"
        return None

class OneTouchReorder:
    def __init__(self):
        self.usual_items = []

    def set_usual_items(self, items):
        self.usual_items = items

    def reorder(self):
        if not self.usual_items:
            return "No usual items set for reorder."
        return f"Reordering: {', '.join(self.usual_items)}"

class VoiceShopping:
    def __init__(self):
        self.cart = []

    def process_command(self, command):
        # Simple command processing for demonstration
        command = command.lower()
        if command.startswith("add "):
            item = command.replace("add ", "").replace(" to cart", "")
            self.cart.append(item)
            return f"Added '{item}' to cart."
        elif command.startswith("remove "):
            item = command.replace("remove ", "").replace(" from cart", "")
            if item in self.cart:
                self.cart.remove(item)
                return f"Removed '{item}' from cart."
            else:
                return f"Item '{item}' not found in cart."
        elif command == "show cart":
            return f"Cart contains: {', '.join(self.cart)}"
        else:
            return "Command not recognized."

class VirtualStoreTour:
    def __init__(self):
        self.sections = ["Produce", "Bakery", "Dairy", "Electronics", "Clothing"]

    def start_tour(self):
        return f"Starting virtual store tour. Sections available: {', '.join(self.sections)}"

    def visit_section(self, section):
        if section in self.sections:
            return f"Visiting {section} section in virtual store."
        else:
            return f"Section '{section}' not found."

class SmartCart:
    def __init__(self):
        self.items = []

    def scan_item(self, item):
        self.items.append(item)
        return f"Scanned item: {item}"

    def checkout(self):
        if not self.items:
            return "No items in cart to checkout."
        items_str = ', '.join(self.items)
        self.items.clear()
        return f"Checked out automatically! Items purchased: {items_str}"

class SmartShoppingAssistant:
    def __init__(self):
        self.memory = MemoryAssistant()
        self.reorder = OneTouchReorder()
        self.voice = VoiceShopping()
        self.virtual_tour = VirtualStoreTour()
        self.cart = SmartCart()

    def summary(self):
        return (
            "Smart Lifestyle Shopping System:\n"
            "- Memory Assistant: Remembers special occasion purchases and reminds you.\n"
            "- One-Touch Reorder: Quickly reorder your usual items.\n"
            "- Voice Shopping: Add/remove items to cart hands-free.\n"
            "- Virtual Store Tour: Explore store sections from home.\n"
            "- Smart Cart: Scan items and checkout automatically."
        )

# Example usage:
if __name__ == "__main__":
    assistant = SmartShoppingAssistant()
    print(assistant.summary())

    # Memory Assistant
    assistant.memory.add_purchase("Birthday", datetime.date(2024, 7, 13), ["Cake", "Candles", "Gift"])
    print(assistant.memory.remind_upcoming("Birthday", datetime.date(2025, 7, 20)))

    # One-Touch Reorder
    assistant.reorder.set_usual_items(["Milk", "Eggs", "Bread"])
    print(assistant.reorder.reorder())

    # Voice Shopping
    print(assistant.voice.process_command("Add apples to cart"))
    print(assistant.voice.process_command("Add bananas to cart"))
    print(assistant.voice.process_command("Show cart"))
    print(assistant.voice.process_command("Remove apples from cart"))
    print(assistant.voice.process_command("Show cart"))

    # Virtual Store Tour
    print(assistant.virtual_tour.start_tour())
    print(assistant.virtual_tour.visit_section("Bakery"))
    print(assistant.virtual_tour.visit_section("Toys"))

    # Smart Cart
    print(assistant.cart.scan_item("Milk"))
    print(assistant.cart.scan_item("Eggs"))
    print(assistant.cart.checkout())